using System.Diagnostics;
using Npgsql;

namespace SchoolAdmission.IntegrationTests.Support;

internal static class TestDatabase
{
    internal static async Task WaitForHoldStatusAsync(Guid holdId, string status, CancellationToken cancellationToken)
    {
        var timer = Stopwatch.StartNew();
        while (timer.Elapsed < TimeSpan.FromSeconds(10))
        {
            if (await HoldStatusAsync(holdId, cancellationToken) == status)
            {
                return;
            }

            await Task.Delay(TimeSpan.FromMilliseconds(100), cancellationToken);
        }

        Assert.Fail($"The stored hold status did not become {status} within ten seconds.");
    }

    internal static async Task WaitForBlockedTransactionsAsync(int blockingProcessId, int expectedCount, CancellationToken cancellationToken)
    {
        await using var observer = new NpgsqlConnection(IntegrationEnvironment.DatabaseConnectionString());
        await observer.OpenAsync(cancellationToken);
        // Later row-lock waiters can block behind the first waiter, rather than directly behind us.
        await using var command = new NpgsqlCommand("""
            WITH RECURSIVE waiters AS (
                SELECT pid FROM pg_stat_activity WHERE @blocker = ANY(pg_blocking_pids(pid))
                UNION
                SELECT activity.pid FROM pg_stat_activity activity
                JOIN waiters ON waiters.pid = ANY(pg_blocking_pids(activity.pid))
            )
            SELECT count(*) FROM waiters
            """, observer);
        command.Parameters.AddWithValue("blocker", blockingProcessId);
        var timer = Stopwatch.StartNew();
        while (timer.Elapsed < TimeSpan.FromSeconds(5))
        {
            if (await command.ExecuteScalarAsync(cancellationToken) is long count && count >= expectedCount)
            {
                return;
            }

            await Task.Delay(TimeSpan.FromMilliseconds(25), cancellationToken);
        }

        Assert.Fail($"{expectedCount} API transaction(s) did not reach the held database row lock within five seconds.");
    }

    internal static async Task<string> HoldStatusAsync(Guid holdId, CancellationToken cancellationToken)
    {
        await using var connection = new NpgsqlConnection(IntegrationEnvironment.DatabaseConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand("SELECT status FROM admissions.holds WHERE id = @id", connection);
        command.Parameters.AddWithValue("id", holdId);
        return Assert.IsType<string>(await command.ExecuteScalarAsync(cancellationToken));
    }

    internal static async Task BackdateHoldAsync(Guid holdId, CancellationToken cancellationToken)
    {
        await using var connection = new NpgsqlConnection(IntegrationEnvironment.DatabaseConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand("UPDATE admissions.holds SET created_at = clock_timestamp() - interval '2 minutes', expires_at = clock_timestamp() - interval '1 second' WHERE id = @id", connection);
        command.Parameters.AddWithValue("id", holdId);
        Assert.Equal(1, await command.ExecuteNonQueryAsync(cancellationToken));
    }

    internal static async Task SetHoldStatusAsync(Guid holdId, string status, CancellationToken cancellationToken)
    {
        await using var connection = new NpgsqlConnection(IntegrationEnvironment.DatabaseConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand("UPDATE admissions.holds SET status = @status WHERE id = @id", connection);
        command.Parameters.AddWithValue("id", holdId);
        command.Parameters.AddWithValue("status", status);
        Assert.Equal(1, await command.ExecuteNonQueryAsync(cancellationToken));
    }

    internal static async Task AssertHoldCountsAsync(Guid classId, int held, int confirmed, CancellationToken cancellationToken)
    {
        await using var connection = new NpgsqlConnection(IntegrationEnvironment.DatabaseConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand("SELECT count(*) FILTER (WHERE status = 'HELD'), count(*) FILTER (WHERE status = 'CONFIRMED') FROM admissions.holds WHERE class_id = @id", connection);
        command.Parameters.AddWithValue("id", classId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        Assert.True(await reader.ReadAsync(cancellationToken));
        Assert.Equal(held, reader.GetInt64(0));
        Assert.Equal(confirmed, reader.GetInt64(1));
    }
}
