using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Npgsql;
using SchoolAdmission.IntegrationTests.Support;

namespace SchoolAdmission.IntegrationTests;

public sealed class HoldEndpointTests
{
    [IntegrationFact]
    public async Task ReservationPreservesLeadingZeroIdentityAndHasPublicStatus()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var classId = await ApiTestData.CreateClassAsync(api, 1, cancellationToken);
        const string studentId = "00152691234567890";

        using var response = await api.SendAsync(HttpMethod.Post, $"/classes/{classId}/holds", cancellationToken, studentId: studentId);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var hold = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        var holdId = hold.GetProperty("holdId").GetGuid();
        Assert.NotEqual(Guid.Empty, holdId);
        Assert.Equal(classId, hold.GetProperty("classId").GetGuid());
        Assert.Equal(JsonValueKind.String, hold.GetProperty("studentId").ValueKind);
        Assert.Equal(studentId, hold.GetProperty("studentId").GetString());
        Assert.Equal("HELD", hold.GetProperty("status").GetString());
        var expiresAt = hold.GetProperty("expiresAt").GetDateTimeOffset();
        Assert.Equal(TimeSpan.Zero, expiresAt.Offset);

        using var statusResponse = await api.SendAsync(HttpMethod.Get, $"/holds/{holdId}", cancellationToken);
        Assert.Equal(HttpStatusCode.OK, statusResponse.StatusCode);
        var status = await statusResponse.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        Assert.Equal(holdId, status.GetProperty("holdId").GetGuid());
        Assert.Equal(classId, status.GetProperty("classId").GetGuid());
        Assert.Equal("HELD", status.GetProperty("status").GetString());
        Assert.Equal(expiresAt, status.GetProperty("expiresAt").GetDateTimeOffset());

        using var fullResponse = await api.SendAsync(HttpMethod.Post, $"/classes/{classId}/holds", cancellationToken, studentId: ApiTestData.NewStudentId());
        await ApiAssertions.ProblemAsync(fullResponse, HttpStatusCode.Conflict, cancellationToken, "class_full");
    }

    [IntegrationFact]
    public async Task HistoryContainsOnlyTheCurrentStudentAndAllowsSeparateClasses()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var firstName = $"Morning class {Guid.NewGuid():N}";
        var secondName = $"Day class {Guid.NewGuid():N}";
        var firstClassId = await ApiTestData.CreateClassAsync(api, 2, cancellationToken, name: firstName);
        var secondClassId = await ApiTestData.CreateClassAsync(api, 2, cancellationToken, name: secondName);
        var studentId = ApiTestData.NewStudentId();
        var anotherStudent = ApiTestData.NewStudentId();
        var firstHold = await CreateHoldAsync(api, firstClassId, studentId, cancellationToken);
        var secondHold = await CreateHoldAsync(api, secondClassId, studentId, cancellationToken);
        var otherHold = await CreateHoldAsync(api, firstClassId, anotherStudent, cancellationToken);

        using var historyResponse = await api.SendAsync(HttpMethod.Get, "/me/holds", cancellationToken, studentId: studentId);
        Assert.Equal(HttpStatusCode.OK, historyResponse.StatusCode);
        var history = await historyResponse.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        Assert.Equal(JsonValueKind.Array, history.ValueKind);
        Assert.Equal(2, history.GetArrayLength());
        Assert.DoesNotContain(history.EnumerateArray(), item => item.GetProperty("holdId").GetGuid() == otherHold);
        foreach (var (holdId, classId, className) in new[] { (firstHold, firstClassId, firstName), (secondHold, secondClassId, secondName) })
        {
            var entry = Assert.Single(history.EnumerateArray(), item => item.GetProperty("holdId").GetGuid() == holdId);
            Assert.Equal(classId, entry.GetProperty("classId").GetGuid());
            Assert.Equal(className, entry.GetProperty("className").GetString());
            Assert.Equal("HELD", entry.GetProperty("status").GetString());
            Assert.Equal(TimeSpan.Zero, entry.GetProperty("expiresAt").GetDateTimeOffset().Offset);
        }
    }

    [IntegrationFact]
    public async Task MissingMalformedAndMultipleStudentIdentifiersAreRejected()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var classId = await ApiTestData.CreateClassAsync(api, 10, cancellationToken);
        string?[] invalidIdentifiers = [null, "", "2015269123456789", "201526912345678900", "2015269123456789x", "２０１５２６９１２３４５６７８９０", "২০১৫২৬৯১২৩৪৫৬৭৮৯০"];

        foreach (var identifier in invalidIdentifiers)
        {
            using var holdResponse = await api.SendAsync(HttpMethod.Post, $"/classes/{classId}/holds", cancellationToken, studentId: identifier);
            await ApiAssertions.ProblemAsync(holdResponse, HttpStatusCode.BadRequest, cancellationToken, "invalid_student_id");
            using var historyResponse = await api.SendAsync(HttpMethod.Get, "/me/holds", cancellationToken, studentId: identifier);
            await ApiAssertions.ProblemAsync(historyResponse, HttpStatusCode.BadRequest, cancellationToken, "invalid_student_id");
        }

        var identifiers = new[] { ApiTestData.NewStudentId(), ApiTestData.NewStudentId() };
        using var duplicateHeaderResponse = await api.SendAsync(HttpMethod.Post, $"/classes/{classId}/holds", cancellationToken, studentIds: identifiers);
        await ApiAssertions.ProblemAsync(duplicateHeaderResponse, HttpStatusCode.BadRequest, cancellationToken, "invalid_student_id");
        using var duplicateHistoryHeaderResponse = await api.SendAsync(HttpMethod.Get, "/me/holds", cancellationToken, studentIds: identifiers);
        await ApiAssertions.ProblemAsync(duplicateHistoryHeaderResponse, HttpStatusCode.BadRequest, cancellationToken, "invalid_student_id");
    }

    [IntegrationFact]
    public async Task MissingAndMalformedIdentifiersReturnNotFoundOrBadRequest()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();

        using var missingClass = await api.SendAsync(HttpMethod.Post, $"/classes/{Guid.NewGuid()}/holds", cancellationToken, studentId: ApiTestData.NewStudentId());
        await ApiAssertions.ProblemAsync(missingClass, HttpStatusCode.NotFound, cancellationToken, "class_not_found");
        using var missingHold = await api.SendAsync(HttpMethod.Get, $"/holds/{Guid.NewGuid()}", cancellationToken);
        await ApiAssertions.ProblemAsync(missingHold, HttpStatusCode.NotFound, cancellationToken, "hold_not_found");
        using var malformedClass = await api.SendAsync(HttpMethod.Post, "/classes/not-a-uuid/holds", cancellationToken, studentId: ApiTestData.NewStudentId());
        await ApiAssertions.ProblemAsync(malformedClass, HttpStatusCode.BadRequest, cancellationToken);
        using var malformedHold = await api.SendAsync(HttpMethod.Get, "/holds/not-a-uuid", cancellationToken);
        await ApiAssertions.ProblemAsync(malformedHold, HttpStatusCode.BadRequest, cancellationToken);
    }

    [IntegrationFact]
    public async Task OneHundredConcurrentRequestsAcrossTwoProcessesAllocateExactlyTenSeats()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var primary = new ApiTestClient();
        using var secondary = new ApiTestClient(secondary: true);
        var classId = await ApiTestData.CreateClassAsync(primary, 10, cancellationToken);
        var start = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var tasks = Enumerable.Range(0, 100).Select(async index =>
        {
            await start.Task.WaitAsync(cancellationToken);
            var api = index % 2 == 0 ? primary : secondary;
            using var response = await api.SendAsync(HttpMethod.Post, $"/classes/{classId}/holds", cancellationToken, studentId: ApiTestData.NewStudentId());
            if (response.StatusCode == HttpStatusCode.Created)
            {
                var hold = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
                Assert.Equal("HELD", hold.GetProperty("status").GetString());
            }
            else
            {
                await ApiAssertions.ProblemAsync(response, HttpStatusCode.Conflict, cancellationToken, "class_full");
            }

            return response.StatusCode;
        }).ToArray();

        start.SetResult();
        var results = await Task.WhenAll(tasks);
        Assert.Equal(10, results.Count(status => status == HttpStatusCode.Created));
        Assert.Equal(90, results.Count(status => status == HttpStatusCode.Conflict));
        await AssertAllocatedSeatsAsync(primary, classId, 10, 10, cancellationToken);
    }

    [IntegrationFact]
    public async Task OneHundredConcurrentDuplicateApplicationsAllocateOnlyOnce()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var primary = new ApiTestClient();
        using var secondary = new ApiTestClient(secondary: true);
        var classId = await ApiTestData.CreateClassAsync(primary, 10, cancellationToken);
        var studentId = ApiTestData.NewStudentId();
        var start = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var tasks = Enumerable.Range(0, 100).Select(async index =>
        {
            await start.Task.WaitAsync(cancellationToken);
            var api = index % 2 == 0 ? primary : secondary;
            using var response = await api.SendAsync(HttpMethod.Post, $"/classes/{classId}/holds", cancellationToken, studentId: studentId);
            if (response.StatusCode != HttpStatusCode.Created)
            {
                await ApiAssertions.ProblemAsync(response, HttpStatusCode.Conflict, cancellationToken, "active_application_exists");
            }

            return response.StatusCode;
        }).ToArray();

        start.SetResult();
        var results = await Task.WhenAll(tasks);
        Assert.Single(results, status => status == HttpStatusCode.Created);
        Assert.Equal(99, results.Count(status => status == HttpStatusCode.Conflict));
        await AssertAllocatedSeatsAsync(primary, classId, 1, 10, cancellationToken);
    }

    [IntegrationFact]
    public async Task ElapsedApplicationCanBeFollowedByANewHoldForTheSameClass()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var classId = await ApiTestData.CreateClassAsync(api, 1, cancellationToken);
        var studentId = ApiTestData.NewStudentId();
        var expiredHoldId = await CreateHoldAsync(api, classId, studentId, cancellationToken);

        await using var connection = new NpgsqlConnection(IntegrationEnvironment.DatabaseConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using (var command = new NpgsqlCommand("UPDATE admissions.holds SET created_at = clock_timestamp() - interval '1 minute', expires_at = clock_timestamp() - interval '1 second' WHERE id = @id", connection))
        {
            command.Parameters.AddWithValue("id", expiredHoldId);
            Assert.Equal(1, await command.ExecuteNonQueryAsync(cancellationToken));
        }

        using var statusResponse = await api.SendAsync(HttpMethod.Get, $"/holds/{expiredHoldId}", cancellationToken);
        Assert.Equal(HttpStatusCode.OK, statusResponse.StatusCode);
        var expiredStatus = await statusResponse.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        Assert.Equal("EXPIRED", expiredStatus.GetProperty("status").GetString());
        var replacementId = await CreateHoldAsync(api, classId, studentId, cancellationToken);
        Assert.NotEqual(expiredHoldId, replacementId);

        await using var persisted = new NpgsqlCommand("SELECT status FROM admissions.holds WHERE id = @id", connection);
        persisted.Parameters.AddWithValue("id", expiredHoldId);
        Assert.Equal("EXPIRED", await persisted.ExecuteScalarAsync(cancellationToken));
        await AssertAllocatedSeatsAsync(api, classId, 1, 1, cancellationToken);
    }

    private static async Task<Guid> CreateHoldAsync(ApiTestClient api, Guid classId, string studentId, CancellationToken cancellationToken)
    {
        using var response = await api.SendAsync(HttpMethod.Post, $"/classes/{classId}/holds", cancellationToken, studentId: studentId);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var hold = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        return hold.GetProperty("holdId").GetGuid();
    }

    private static async Task AssertAllocatedSeatsAsync(ApiTestClient api, Guid classId, int allocatedSeats, int totalSeats, CancellationToken cancellationToken)
    {
        using var response = await api.SendAsync(HttpMethod.Get, $"/classes/{classId}", cancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var summary = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        Assert.Equal(allocatedSeats, summary.GetProperty("heldSeats").GetInt32());
        Assert.Equal(0, summary.GetProperty("confirmedSeats").GetInt32());
        Assert.Equal(totalSeats - allocatedSeats, summary.GetProperty("availableSeats").GetInt32());

        await using var connection = new NpgsqlConnection(IntegrationEnvironment.DatabaseConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand("SELECT count(*) FROM admissions.holds WHERE class_id = @class_id AND status IN ('HELD', 'CONFIRMED')", connection);
        command.Parameters.AddWithValue("class_id", classId);
        var persistedCount = Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
        Assert.Equal(allocatedSeats, persistedCount);
        Assert.True(persistedCount <= totalSeats);
    }
}
