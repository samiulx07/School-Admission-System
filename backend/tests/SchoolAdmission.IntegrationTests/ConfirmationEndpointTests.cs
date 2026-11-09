using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Npgsql;
using SchoolAdmission.IntegrationTests.Support;

namespace SchoolAdmission.IntegrationTests;

public sealed class ConfirmationEndpointTests
{
    [IntegrationFact]
    public async Task ConcurrentConfirmationIsIdempotentAcrossProcessesAndAfterOriginalExpiry()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var primary = new ApiTestClient();
        using var secondary = new ApiTestClient(ApiTarget.Secondary);
        var classId = await ApiTestData.CreateClassAsync(primary, 1, cancellationToken);
        var studentId = ApiTestData.NewStudentId();
        var holdId = await ApiTestData.CreateHoldAsync(primary, classId, studentId, cancellationToken);
        await ApiAssertions.ClassCountsAsync(primary, classId, 1, 0, 0, cancellationToken);
        var start = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var tasks = Enumerable.Range(0, 100).Select(async index =>
        {
            await start.Task.WaitAsync(cancellationToken);
            var api = index % 2 == 0 ? primary : secondary;
            await AssertConfirmedAsync(api, holdId, studentId, cancellationToken);
        }).ToArray();

        start.SetResult();
        await Task.WhenAll(tasks);
        await ApiAssertions.ClassCountsAsync(primary, classId, 0, 1, 0, cancellationToken);
        await TestDatabase.AssertHoldCountsAsync(classId, 0, 1, cancellationToken);

        await TestDatabase.BackdateHoldAsync(holdId, cancellationToken);
        await AssertConfirmedAsync(secondary, holdId, studentId, cancellationToken);
        await ApiAssertions.ClassCountsAsync(primary, classId, 0, 1, 0, cancellationToken);
        await TestDatabase.AssertHoldCountsAsync(classId, 0, 1, cancellationToken);
    }

    [IntegrationFact]
    public async Task ConfirmedStudentCannotApplyAgainEvenWhenTheClassHasSpareCapacity()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var classId = await ApiTestData.CreateClassAsync(api, 2, cancellationToken);
        var studentId = ApiTestData.NewStudentId();
        var holdId = await ApiTestData.CreateHoldAsync(api, classId, studentId, cancellationToken);
        await AssertConfirmedAsync(api, holdId, studentId, cancellationToken);

        using var duplicate = await api.SendAsync(HttpMethod.Post, $"/classes/{classId}/holds", cancellationToken, studentId: studentId);
        await ApiAssertions.ProblemAsync(duplicate, HttpStatusCode.Conflict, cancellationToken, "active_application_exists");
        await ApiAssertions.ClassCountsAsync(api, classId, 0, 1, 1, cancellationToken);
        await ApiTestData.CreateHoldAsync(api, classId, ApiTestData.NewStudentId(), cancellationToken);
        using var repeatedDuplicate = await api.SendAsync(HttpMethod.Post, $"/classes/{classId}/holds", cancellationToken, studentId: studentId);
        await ApiAssertions.ProblemAsync(repeatedDuplicate, HttpStatusCode.Conflict, cancellationToken, "active_application_exists");
        await ApiAssertions.ClassCountsAsync(api, classId, 1, 1, 0, cancellationToken);
        await TestDatabase.AssertHoldCountsAsync(classId, 1, 1, cancellationToken);
    }

    [IntegrationFact]
    public async Task OnlyTheOwnerCanConfirmPendingOrAlreadyConfirmedApplications()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var classId = await ApiTestData.CreateClassAsync(api, 1, cancellationToken);
        var owner = ApiTestData.NewStudentId();
        var stranger = ApiTestData.NewStudentId();
        var holdId = await ApiTestData.CreateHoldAsync(api, classId, owner, cancellationToken);

        using var pendingResponse = await api.SendAsync(HttpMethod.Post, $"/holds/{holdId}/confirm", cancellationToken, studentId: stranger);
        await ApiAssertions.ProblemAsync(pendingResponse, HttpStatusCode.Forbidden, cancellationToken, "hold_not_owned");
        await ApiAssertions.ClassCountsAsync(api, classId, 1, 0, 0, cancellationToken);
        await AssertConfirmedAsync(api, holdId, owner, cancellationToken);
        using var confirmedResponse = await api.SendAsync(HttpMethod.Post, $"/holds/{holdId}/confirm", cancellationToken, studentId: stranger);
        await ApiAssertions.ProblemAsync(confirmedResponse, HttpStatusCode.Forbidden, cancellationToken, "hold_not_owned");
        await ApiAssertions.ClassCountsAsync(api, classId, 0, 1, 0, cancellationToken);
    }

    [IntegrationFact]
    public async Task ExpiredAndCancelledApplicationsCannotBeConfirmed()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var classId = await ApiTestData.CreateClassAsync(api, 2, cancellationToken);
        var expiredStudent = ApiTestData.NewStudentId();
        var cancelledStudent = ApiTestData.NewStudentId();
        var expiredId = await ApiTestData.CreateHoldAsync(api, classId, expiredStudent, cancellationToken);
        var cancelledId = await ApiTestData.CreateHoldAsync(api, classId, cancelledStudent, cancellationToken);
        await TestDatabase.BackdateHoldAsync(expiredId, cancellationToken);
        await TestDatabase.SetHoldStatusAsync(cancelledId, "CANCELLED", cancellationToken);

        foreach (var (holdId, studentId) in new[] { (expiredId, expiredStudent), (cancelledId, cancelledStudent) })
        {
            using var response = await api.SendAsync(HttpMethod.Post, $"/holds/{holdId}/confirm", cancellationToken, studentId: studentId);
            await ApiAssertions.ProblemAsync(response, HttpStatusCode.Conflict, cancellationToken, "hold_not_confirmable");
        }

        await ApiAssertions.ClassCountsAsync(api, classId, 0, 0, 2, cancellationToken);
        await TestDatabase.AssertHoldCountsAsync(classId, 0, 0, cancellationToken);
    }

    [IntegrationFact]
    public async Task ConfirmationValidatesIdentityAndHoldIdentifiers()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var classId = await ApiTestData.CreateClassAsync(api, 1, cancellationToken);
        var studentId = ApiTestData.NewStudentId();
        var holdId = await ApiTestData.CreateHoldAsync(api, classId, studentId, cancellationToken);
        string?[] invalidIdentifiers = [null, "", "2015269123456789", "201526912345678900", "2015269123456789x", "২০১৫২৬৯১২৩৪৫৬৭৮৯০"];
        foreach (var identifier in invalidIdentifiers)
        {
            using var response = await api.SendAsync(HttpMethod.Post, $"/holds/{holdId}/confirm", cancellationToken, studentId: identifier);
            await ApiAssertions.ProblemAsync(response, HttpStatusCode.BadRequest, cancellationToken, "invalid_student_id");
        }

        using var multipleHeaders = await api.SendAsync(HttpMethod.Post, $"/holds/{holdId}/confirm", cancellationToken, studentIds: [studentId, ApiTestData.NewStudentId()]);
        await ApiAssertions.ProblemAsync(multipleHeaders, HttpStatusCode.BadRequest, cancellationToken, "invalid_student_id");
        using var missing = await api.SendAsync(HttpMethod.Post, $"/holds/{Guid.NewGuid()}/confirm", cancellationToken, studentId: studentId);
        await ApiAssertions.ProblemAsync(missing, HttpStatusCode.NotFound, cancellationToken, "hold_not_found");
        using var malformed = await api.SendAsync(HttpMethod.Post, "/holds/not-a-uuid/confirm", cancellationToken, studentId: studentId);
        await ApiAssertions.ProblemAsync(malformed, HttpStatusCode.BadRequest, cancellationToken);
        await ApiAssertions.ClassCountsAsync(api, classId, 1, 0, 0, cancellationToken);
    }

    [IntegrationFact]
    public async Task ConfirmationUsesFreshDatabaseTimeAfterWaitingForTheClassLock()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var classId = await ApiTestData.CreateClassAsync(api, 1, cancellationToken);
        var studentId = ApiTestData.NewStudentId();
        var holdId = await ApiTestData.CreateHoldAsync(api, classId, studentId, cancellationToken);

        await using var blocker = new NpgsqlConnection(IntegrationEnvironment.DatabaseConnectionString());
        await blocker.OpenAsync(cancellationToken);
        await using var transaction = await blocker.BeginTransactionAsync(cancellationToken);
        await using (var command = new NpgsqlCommand("SELECT id FROM admissions.classes WHERE id = @id FOR UPDATE", blocker, transaction))
        {
            command.Parameters.AddWithValue("id", classId);
            Assert.Equal(classId, Assert.IsType<Guid>(await command.ExecuteScalarAsync(cancellationToken)));
        }

        var confirmation = api.SendAsync(HttpMethod.Post, $"/holds/{holdId}/confirm", cancellationToken, studentId: studentId);
        await TestDatabase.WaitForBlockedTransactionsAsync(blocker.ProcessID, 1, cancellationToken);
        Assert.False(confirmation.IsCompleted);

        // The API transaction is already waiting; its start time now precedes this new deadline.
        await using (var command = new NpgsqlCommand("UPDATE admissions.holds SET expires_at = clock_timestamp() + interval '1 second' WHERE id = @id", blocker, transaction))
        {
            command.Parameters.AddWithValue("id", holdId);
            Assert.Equal(1, await command.ExecuteNonQueryAsync(cancellationToken));
        }

        await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        using var response = await confirmation.WaitAsync(TimeSpan.FromSeconds(10), cancellationToken);
        await ApiAssertions.ProblemAsync(response, HttpStatusCode.Conflict, cancellationToken, "hold_not_confirmable");
        await ApiAssertions.ClassCountsAsync(api, classId, 0, 0, 1, cancellationToken);
        await TestDatabase.AssertHoldCountsAsync(classId, 0, 0, cancellationToken);
    }

    private static async Task AssertConfirmedAsync(ApiTestClient api, Guid holdId, string studentId, CancellationToken cancellationToken)
    {
        using var response = await api.SendAsync(HttpMethod.Post, $"/holds/{holdId}/confirm", cancellationToken, studentId: studentId);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        Assert.Equal(holdId, result.GetProperty("holdId").GetGuid());
        Assert.Equal("CONFIRMED", result.GetProperty("status").GetString());
    }
}
