using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using SchoolAdmission.IntegrationTests.Support;

namespace SchoolAdmission.IntegrationTests;

public sealed class CancellationEndpointTests
{
    [IntegrationFact]
    public async Task CancellationReturnsAnEmptyResponseReleasesTheSeatAndAllowsReapplication()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var classId = await ApiTestData.CreateClassAsync(api, 1, cancellationToken);
        var studentId = ApiTestData.NewStudentId();
        var cancelledId = await ApiTestData.CreateHoldAsync(api, classId, studentId, cancellationToken);

        await AssertCancelledAsync(api, cancelledId, studentId, cancellationToken);
        Assert.Equal("CANCELLED", await TestDatabase.HoldStatusAsync(cancelledId, cancellationToken));
        await ApiAssertions.HoldStatusAsync(api, cancelledId, "CANCELLED", cancellationToken);
        await ApiAssertions.ClassCountsAsync(api, classId, 0, 0, 1, cancellationToken);
        await TestDatabase.AssertHoldCountsAsync(classId, 0, 0, cancellationToken);

        var replacementId = await ApiTestData.CreateHoldAsync(api, classId, studentId, cancellationToken);
        Assert.NotEqual(cancelledId, replacementId);
        await ApiAssertions.ClassCountsAsync(api, classId, 1, 0, 0, cancellationToken);
        using var response = await api.SendAsync(HttpMethod.Get, "/me/holds", cancellationToken, studentId: studentId);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var history = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        var cancelledEntry = Assert.Single(history.EnumerateArray(), item => item.GetProperty("holdId").GetGuid() == cancelledId);
        var replacementEntry = Assert.Single(history.EnumerateArray(), item => item.GetProperty("holdId").GetGuid() == replacementId);
        Assert.Equal("CANCELLED", cancelledEntry.GetProperty("status").GetString());
        Assert.Equal("HELD", replacementEntry.GetProperty("status").GetString());
    }

    [IntegrationFact]
    public async Task ConcurrentRepeatedCancellationAcrossProcessesReleasesTheSeatOnlyOnce()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var primary = new ApiTestClient();
        using var secondary = new ApiTestClient(secondary: true);
        var classId = await ApiTestData.CreateClassAsync(primary, 1, cancellationToken);
        var studentId = ApiTestData.NewStudentId();
        var holdId = await ApiTestData.CreateHoldAsync(primary, classId, studentId, cancellationToken);
        var start = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var tasks = Enumerable.Range(0, 100).Select(async index =>
        {
            await start.Task.WaitAsync(cancellationToken);
            var api = index % 2 == 0 ? primary : secondary;
            await AssertCancelledAsync(api, holdId, studentId, cancellationToken);
        }).ToArray();

        start.SetResult();
        await Task.WhenAll(tasks);
        await ApiAssertions.ClassCountsAsync(primary, classId, 0, 0, 1, cancellationToken);
        await TestDatabase.AssertHoldCountsAsync(classId, 0, 0, cancellationToken);
        Assert.Equal("CANCELLED", await TestDatabase.HoldStatusAsync(holdId, cancellationToken));

        await TestDatabase.BackdateHoldAsync(holdId, cancellationToken);
        await AssertCancelledAsync(secondary, holdId, studentId, cancellationToken);
        await ApiAssertions.ClassCountsAsync(primary, classId, 0, 0, 1, cancellationToken);
    }

    [IntegrationFact]
    public async Task CancellationChecksOwnershipBeforePendingAndTerminalStates()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var classId = await ApiTestData.CreateClassAsync(api, 3, cancellationToken);
        var pendingStudent = ApiTestData.NewStudentId();
        var cancelledStudent = ApiTestData.NewStudentId();
        var confirmedStudent = ApiTestData.NewStudentId();
        var stranger = ApiTestData.NewStudentId();
        var pendingId = await ApiTestData.CreateHoldAsync(api, classId, pendingStudent, cancellationToken);
        var cancelledId = await ApiTestData.CreateHoldAsync(api, classId, cancelledStudent, cancellationToken);
        var confirmedId = await ApiTestData.CreateHoldAsync(api, classId, confirmedStudent, cancellationToken);
        await AssertCancelledAsync(api, cancelledId, cancelledStudent, cancellationToken);
        using var confirmation = await api.SendAsync(HttpMethod.Post, $"/holds/{confirmedId}/confirm", cancellationToken, studentId: confirmedStudent);
        Assert.Equal(HttpStatusCode.OK, confirmation.StatusCode);

        foreach (var holdId in new[] { pendingId, cancelledId, confirmedId })
        {
            using var response = await api.SendAsync(HttpMethod.Delete, $"/holds/{holdId}", cancellationToken, studentId: stranger);
            await ApiAssertions.ProblemAsync(response, HttpStatusCode.Forbidden, cancellationToken, "hold_not_owned");
        }

        Assert.Equal("HELD", await TestDatabase.HoldStatusAsync(pendingId, cancellationToken));
        Assert.Equal("CANCELLED", await TestDatabase.HoldStatusAsync(cancelledId, cancellationToken));
        Assert.Equal("CONFIRMED", await TestDatabase.HoldStatusAsync(confirmedId, cancellationToken));
        await ApiAssertions.ClassCountsAsync(api, classId, 1, 1, 1, cancellationToken);
    }

    [IntegrationFact]
    public async Task ConfirmedAndExpiredApplicationsCannotBeCancelled()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var classId = await ApiTestData.CreateClassAsync(api, 2, cancellationToken);
        var confirmedStudent = ApiTestData.NewStudentId();
        var expiredStudent = ApiTestData.NewStudentId();
        var confirmedId = await ApiTestData.CreateHoldAsync(api, classId, confirmedStudent, cancellationToken);
        var expiredId = await ApiTestData.CreateHoldAsync(api, classId, expiredStudent, cancellationToken);
        using var confirmation = await api.SendAsync(HttpMethod.Post, $"/holds/{confirmedId}/confirm", cancellationToken, studentId: confirmedStudent);
        Assert.Equal(HttpStatusCode.OK, confirmation.StatusCode);
        await TestDatabase.BackdateHoldAsync(expiredId, cancellationToken);

        foreach (var (holdId, studentId) in new[] { (confirmedId, confirmedStudent), (expiredId, expiredStudent) })
        {
            using var response = await api.SendAsync(HttpMethod.Delete, $"/holds/{holdId}", cancellationToken, studentId: studentId);
            await ApiAssertions.ProblemAsync(response, HttpStatusCode.Conflict, cancellationToken, "hold_not_cancellable");
        }

        await ApiAssertions.HoldStatusAsync(api, confirmedId, "CONFIRMED", cancellationToken);
        await ApiAssertions.HoldStatusAsync(api, expiredId, "EXPIRED", cancellationToken);
        await ApiAssertions.ClassCountsAsync(api, classId, 0, 1, 1, cancellationToken);
        await TestDatabase.AssertHoldCountsAsync(classId, 0, 1, cancellationToken);
    }

    [IntegrationFact]
    public async Task CancellationValidatesIdentityAndHoldIdentifiers()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var classId = await ApiTestData.CreateClassAsync(api, 1, cancellationToken);
        var studentId = ApiTestData.NewStudentId();
        var holdId = await ApiTestData.CreateHoldAsync(api, classId, studentId, cancellationToken);
        string?[] invalidIdentifiers = [null, "", "2015269123456789", "201526912345678900", "2015269123456789x", "২০১৫২৬৯১২৩৪৫৬৭৮৯০"];
        foreach (var identifier in invalidIdentifiers)
        {
            using var response = await api.SendAsync(HttpMethod.Delete, $"/holds/{holdId}", cancellationToken, studentId: identifier);
            await ApiAssertions.ProblemAsync(response, HttpStatusCode.BadRequest, cancellationToken, "invalid_student_id");
        }

        using var multipleHeaders = await api.SendAsync(HttpMethod.Delete, $"/holds/{holdId}", cancellationToken, studentIds: [studentId, ApiTestData.NewStudentId()]);
        await ApiAssertions.ProblemAsync(multipleHeaders, HttpStatusCode.BadRequest, cancellationToken, "invalid_student_id");
        using var missing = await api.SendAsync(HttpMethod.Delete, $"/holds/{Guid.NewGuid()}", cancellationToken, studentId: studentId);
        await ApiAssertions.ProblemAsync(missing, HttpStatusCode.NotFound, cancellationToken, "hold_not_found");
        using var malformed = await api.SendAsync(HttpMethod.Delete, "/holds/not-a-uuid", cancellationToken, studentId: studentId);
        await ApiAssertions.ProblemAsync(malformed, HttpStatusCode.BadRequest, cancellationToken);
        await ApiAssertions.ClassCountsAsync(api, classId, 1, 0, 0, cancellationToken);
    }

    [IntegrationFact]
    public async Task ConcurrentConfirmationAndCancellationHaveExactlyOneWinningTransition()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var primary = new ApiTestClient();
        using var secondary = new ApiTestClient(secondary: true);
        for (var iteration = 0; iteration < 10; iteration++)
        {
            var classId = await ApiTestData.CreateClassAsync(primary, 1, cancellationToken);
            var studentId = ApiTestData.NewStudentId();
            var holdId = await ApiTestData.CreateHoldAsync(primary, classId, studentId, cancellationToken);
            var start = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var confirmation = SendWhenReleasedAsync(iteration % 2 == 0 ? primary : secondary, HttpMethod.Post, $"/holds/{holdId}/confirm", studentId, start.Task, cancellationToken);
            var cancellation = SendWhenReleasedAsync(iteration % 2 == 0 ? secondary : primary, HttpMethod.Delete, $"/holds/{holdId}", studentId, start.Task, cancellationToken);
            start.SetResult();
            await Task.WhenAll(confirmation, cancellation);
            using var confirmResponse = await confirmation;
            using var cancelResponse = await cancellation;

            if (confirmResponse.StatusCode == HttpStatusCode.OK)
            {
                await ApiAssertions.ProblemAsync(cancelResponse, HttpStatusCode.Conflict, cancellationToken, "hold_not_cancellable");
                Assert.Equal("CONFIRMED", await TestDatabase.HoldStatusAsync(holdId, cancellationToken));
                await ApiAssertions.ClassCountsAsync(primary, classId, 0, 1, 0, cancellationToken);
                await TestDatabase.AssertHoldCountsAsync(classId, 0, 1, cancellationToken);
                using var full = await primary.SendAsync(HttpMethod.Post, $"/classes/{classId}/holds", cancellationToken, studentId: ApiTestData.NewStudentId());
                await ApiAssertions.ProblemAsync(full, HttpStatusCode.Conflict, cancellationToken, "class_full");
            }
            else
            {
                await ApiAssertions.ProblemAsync(confirmResponse, HttpStatusCode.Conflict, cancellationToken, "hold_not_confirmable");
                Assert.Equal(HttpStatusCode.NoContent, cancelResponse.StatusCode);
                Assert.Empty(await cancelResponse.Content.ReadAsStringAsync(cancellationToken));
                Assert.Equal("CANCELLED", await TestDatabase.HoldStatusAsync(holdId, cancellationToken));
                await ApiAssertions.ClassCountsAsync(primary, classId, 0, 0, 1, cancellationToken);
                await TestDatabase.AssertHoldCountsAsync(classId, 0, 0, cancellationToken);
                await ApiTestData.CreateHoldAsync(primary, classId, ApiTestData.NewStudentId(), cancellationToken);
                await ApiAssertions.ClassCountsAsync(primary, classId, 1, 0, 0, cancellationToken);
            }
        }
    }

    private static async Task<HttpResponseMessage> SendWhenReleasedAsync(ApiTestClient api, HttpMethod method, string path, string studentId, Task start, CancellationToken cancellationToken)
    {
        await start.WaitAsync(cancellationToken);
        return await api.SendAsync(method, path, cancellationToken, studentId: studentId);
    }

    private static async Task AssertCancelledAsync(ApiTestClient api, Guid holdId, string studentId, CancellationToken cancellationToken)
    {
        using var response = await api.SendAsync(HttpMethod.Delete, $"/holds/{holdId}", cancellationToken, studentId: studentId);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsStringAsync(cancellationToken));
    }
}
