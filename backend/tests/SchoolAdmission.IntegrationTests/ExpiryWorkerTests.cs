using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Npgsql;
using SchoolAdmission.IntegrationTests.Support;

namespace SchoolAdmission.IntegrationTests;

[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class ExpiryWorkerCollection
{
    public const string Name = "Background expiry";
}

[Collection(ExpiryWorkerCollection.Name)]
public sealed class ExpiryWorkerTests
{
    [ExpiryIntegrationFact]
    public async Task ThreeSecondHoldExpiresInStorageWithoutApplicationRequestsAndReleasesItsSeat()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient(ApiTarget.Expiry);
        var classId = await ApiTestData.CreateClassAsync(api, 1, cancellationToken);
        var studentId = ApiTestData.NewStudentId();
        using var creation = await api.SendAsync(HttpMethod.Post, $"/classes/{classId}/holds", cancellationToken, studentId: studentId);
        Assert.Equal(HttpStatusCode.Created, creation.StatusCode);
        var hold = await creation.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        var holdId = hold.GetProperty("holdId").GetGuid();
        Assert.Equal(TimeSpan.FromSeconds(3), hold.GetProperty("expiresAt").GetDateTimeOffset() - hold.GetProperty("createdAt").GetDateTimeOffset());

        // This collection runs alone. Only PostgreSQL is polled until EXPIRED is actually stored.
        await TestDatabase.WaitForHoldStatusAsync(holdId, "EXPIRED", cancellationToken);

        await ApiAssertions.ClassCountsAsync(api, classId, 0, 0, 1, cancellationToken);
        await ApiAssertions.HoldStatusAsync(api, holdId, "EXPIRED", cancellationToken);
        using var confirmation = await api.SendAsync(HttpMethod.Post, $"/holds/{holdId}/confirm", cancellationToken, studentId: studentId);
        await ApiAssertions.ProblemAsync(confirmation, HttpStatusCode.Conflict, cancellationToken, "hold_not_confirmable");
        using var cancellation = await api.SendAsync(HttpMethod.Delete, $"/holds/{holdId}", cancellationToken, studentId: studentId);
        await ApiAssertions.ProblemAsync(cancellation, HttpStatusCode.Conflict, cancellationToken, "hold_not_cancellable");
        var replacement = await ApiTestData.CreateHoldAsync(api, classId, ApiTestData.NewStudentId(), cancellationToken);
        Assert.NotEqual(holdId, replacement);
        await ApiAssertions.ClassCountsAsync(api, classId, 1, 0, 0, cancellationToken);
    }

    [ExpiryIntegrationFact]
    public async Task WorkerLeavesConfirmedAndCancelledApplicationsUnchangedAfterOriginalExpiry()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var classId = await ApiTestData.CreateClassAsync(api, 3, cancellationToken);
        var confirmedStudent = ApiTestData.NewStudentId();
        var cancelledStudent = ApiTestData.NewStudentId();
        var confirmedId = await ApiTestData.CreateHoldAsync(api, classId, confirmedStudent, cancellationToken);
        var cancelledId = await ApiTestData.CreateHoldAsync(api, classId, cancelledStudent, cancellationToken);
        var pendingId = await ApiTestData.CreateHoldAsync(api, classId, ApiTestData.NewStudentId(), cancellationToken);
        using var confirmation = await api.SendAsync(HttpMethod.Post, $"/holds/{confirmedId}/confirm", cancellationToken, studentId: confirmedStudent);
        Assert.Equal(HttpStatusCode.OK, confirmation.StatusCode);
        using var cancellation = await api.SendAsync(HttpMethod.Delete, $"/holds/{cancelledId}", cancellationToken, studentId: cancelledStudent);
        Assert.Equal(HttpStatusCode.NoContent, cancellation.StatusCode);
        await TestDatabase.BackdateHoldAsync(confirmedId, cancellationToken);
        await TestDatabase.BackdateHoldAsync(cancelledId, cancellationToken);
        await TestDatabase.BackdateHoldAsync(pendingId, cancellationToken);

        // Expiring the third hold proves a worker processed this same class after all three deadlines.
        await TestDatabase.WaitForHoldStatusAsync(pendingId, "EXPIRED", cancellationToken);
        Assert.Equal("CONFIRMED", await TestDatabase.HoldStatusAsync(confirmedId, cancellationToken));
        Assert.Equal("CANCELLED", await TestDatabase.HoldStatusAsync(cancelledId, cancellationToken));
        await ApiAssertions.ClassCountsAsync(api, classId, 0, 1, 2, cancellationToken);
        await TestDatabase.AssertHoldCountsAsync(classId, 0, 1, cancellationToken);
    }

    [ExpiryIntegrationFact]
    public async Task LockedClassDoesNotPreventTheWorkerFromExpiringAnotherClass()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var lockedClassId = await ApiTestData.CreateClassAsync(api, 1, cancellationToken);
        var otherClassId = await ApiTestData.CreateClassAsync(api, 1, cancellationToken);
        var lockedHoldId = await ApiTestData.CreateHoldAsync(api, lockedClassId, ApiTestData.NewStudentId(), cancellationToken);
        var otherHoldId = await ApiTestData.CreateHoldAsync(api, otherClassId, ApiTestData.NewStudentId(), cancellationToken);
        await using var blocker = new NpgsqlConnection(IntegrationEnvironment.DatabaseConnectionString());
        await blocker.OpenAsync(cancellationToken);
        await using var transaction = await blocker.BeginTransactionAsync(cancellationToken);
        await LockClassAsync(blocker, transaction, lockedClassId, cancellationToken);

        // Fixture-only updates commit deadlines separately while the class row stays locked.
        await TestDatabase.BackdateHoldAsync(lockedHoldId, cancellationToken);
        await TestDatabase.BackdateHoldAsync(otherHoldId, cancellationToken);
        await TestDatabase.WaitForHoldStatusAsync(otherHoldId, "EXPIRED", cancellationToken);
        Assert.Equal("HELD", await TestDatabase.HoldStatusAsync(lockedHoldId, cancellationToken));

        await transaction.CommitAsync(cancellationToken);
        await TestDatabase.WaitForHoldStatusAsync(lockedHoldId, "EXPIRED", cancellationToken);
        await ApiAssertions.ClassCountsAsync(api, lockedClassId, 0, 0, 1, cancellationToken);
        await ApiAssertions.ClassCountsAsync(api, otherClassId, 0, 0, 1, cancellationToken);
    }

    [ExpiryIntegrationFact]
    public async Task ExpiryRacingWithQueuedConfirmationAndCancellationCannotAllocateASeat()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var primary = new ApiTestClient();
        using var secondary = new ApiTestClient(ApiTarget.Secondary);
        var classId = await ApiTestData.CreateClassAsync(primary, 1, cancellationToken);
        var studentId = ApiTestData.NewStudentId();
        var holdId = await ApiTestData.CreateHoldAsync(primary, classId, studentId, cancellationToken);
        await using var blocker = new NpgsqlConnection(IntegrationEnvironment.DatabaseConnectionString());
        await blocker.OpenAsync(cancellationToken);
        await using var transaction = await blocker.BeginTransactionAsync(cancellationToken);
        await LockClassAsync(blocker, transaction, classId, cancellationToken);
        var confirmation = primary.SendAsync(HttpMethod.Post, $"/holds/{holdId}/confirm", cancellationToken, studentId: studentId);
        var cancellation = secondary.SendAsync(HttpMethod.Delete, $"/holds/{holdId}", cancellationToken, studentId: studentId);
        await TestDatabase.WaitForBlockedTransactionsAsync(blocker.ProcessID, 2, cancellationToken);
        await using (var command = new NpgsqlCommand("UPDATE admissions.holds SET expires_at = clock_timestamp() + interval '1 second' WHERE id = @id", blocker, transaction))
        {
            command.Parameters.AddWithValue("id", holdId);
            Assert.Equal(1, await command.ExecuteNonQueryAsync(cancellationToken));
        }

        await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        await Task.WhenAll(confirmation, cancellation);
        using var confirmResponse = await confirmation;
        using var cancelResponse = await cancellation;
        await ApiAssertions.ProblemAsync(confirmResponse, HttpStatusCode.Conflict, cancellationToken, "hold_not_confirmable");
        await ApiAssertions.ProblemAsync(cancelResponse, HttpStatusCode.Conflict, cancellationToken, "hold_not_cancellable");
        Assert.Equal("EXPIRED", await TestDatabase.HoldStatusAsync(holdId, cancellationToken));
        await TestDatabase.AssertHoldCountsAsync(classId, 0, 0, cancellationToken);
        await ApiAssertions.ClassCountsAsync(primary, classId, 0, 0, 1, cancellationToken);
    }

    private static async Task LockClassAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, Guid classId, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand("SELECT id FROM admissions.classes WHERE id = @id FOR UPDATE", connection, transaction);
        command.Parameters.AddWithValue("id", classId);
        Assert.Equal(classId, Assert.IsType<Guid>(await command.ExecuteScalarAsync(cancellationToken)));
    }
}
