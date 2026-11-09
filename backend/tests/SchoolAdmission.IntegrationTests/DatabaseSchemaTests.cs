using Npgsql;
using SchoolAdmission.IntegrationTests.Support;

namespace SchoolAdmission.IntegrationTests;

public sealed class DatabaseSchemaTests
{
    [DatabaseFact]
    public async Task DatabaseRejectsInvalidCapacityIdentifiersAndLifetimes()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var connection = new NpgsqlConnection(IntegrationEnvironment.DatabaseConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await transaction.SaveAsync("invalid_capacity", cancellationToken);
        var capacityError = await Assert.ThrowsAsync<PostgresException>(() => InsertClassAsync(connection, transaction, Guid.NewGuid(), 0, cancellationToken));
        Assert.Equal(PostgresErrorCodes.CheckViolation, capacityError.SqlState);
        Assert.Equal("ck_classes_positive_seats", capacityError.ConstraintName);
        await transaction.RollbackAsync("invalid_capacity", cancellationToken);

        var classId = Guid.NewGuid();
        await InsertClassAsync(connection, transaction, classId, 10, cancellationToken);
        await AssertHoldRejectedAsync(connection, transaction, classId, "2015269123456789x", "HELD", 600, "ck_holds_student_id", cancellationToken);
        await AssertHoldRejectedAsync(connection, transaction, classId, "20152691234567890", "INVALID", 600, "ck_holds_status", cancellationToken);
        await AssertHoldRejectedAsync(connection, transaction, classId, "20152691234567890", "HELD", 0, "ck_holds_expiry", cancellationToken);
        // Disposing this uncommitted transaction removes only this test's own rows.
    }

    [DatabaseFact]
    public async Task DatabaseAllowsHistoryButRejectsMultipleActiveApplicationsPerStudentAndClass()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var connection = new NpgsqlConnection(IntegrationEnvironment.DatabaseConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        var classId = Guid.NewGuid();
        const string studentId = "20152691234567890";
        await InsertClassAsync(connection, transaction, classId, 10, cancellationToken);
        await InsertHoldAsync(connection, transaction, classId, studentId, "EXPIRED", 600, cancellationToken);
        await InsertHoldAsync(connection, transaction, classId, studentId, "CANCELLED", 600, cancellationToken);
        await InsertHoldAsync(connection, transaction, classId, studentId, "HELD", 600, cancellationToken);

        foreach (var status in new[] { "HELD", "CONFIRMED" })
        {
            await transaction.SaveAsync("duplicate_application", cancellationToken);
            var error = await Assert.ThrowsAsync<PostgresException>(() => InsertHoldAsync(connection, transaction, classId, studentId, status, 600, cancellationToken));
            Assert.Equal(PostgresErrorCodes.UniqueViolation, error.SqlState);
            Assert.Equal("ux_holds_active_student_class", error.ConstraintName);
            await transaction.RollbackAsync("duplicate_application", cancellationToken);
        }

        var anotherClassId = Guid.NewGuid();
        await InsertClassAsync(connection, transaction, anotherClassId, 10, cancellationToken);
        await InsertHoldAsync(connection, transaction, anotherClassId, studentId, "HELD", 600, cancellationToken);
    }

    private static async Task AssertHoldRejectedAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, Guid classId, string studentId, string status, int durationSeconds, string constraint, CancellationToken cancellationToken)
    {
        await transaction.SaveAsync("invalid_hold", cancellationToken);
        var error = await Assert.ThrowsAsync<PostgresException>(() => InsertHoldAsync(connection, transaction, classId, studentId, status, durationSeconds, cancellationToken));
        Assert.Equal(PostgresErrorCodes.CheckViolation, error.SqlState);
        Assert.Equal(constraint, error.ConstraintName);
        await transaction.RollbackAsync("invalid_hold", cancellationToken);
    }

    private static async Task InsertClassAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, Guid classId, int totalSeats, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand("INSERT INTO admissions.classes (id, name, total_seats, created_at) VALUES (@id, 'Isolated schema test', @seats, statement_timestamp())", connection, transaction);
        command.Parameters.AddWithValue("id", classId);
        command.Parameters.AddWithValue("seats", totalSeats);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task InsertHoldAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, Guid classId, string studentId, string status, int durationSeconds, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand("INSERT INTO admissions.holds (id, class_id, student_id, status, created_at, expires_at) VALUES (@id, @class_id, @student_id, @status, statement_timestamp(), statement_timestamp() + @seconds * interval '1 second')", connection, transaction);
        command.Parameters.AddWithValue("id", Guid.NewGuid());
        command.Parameters.AddWithValue("class_id", classId);
        command.Parameters.AddWithValue("student_id", studentId);
        command.Parameters.AddWithValue("status", status);
        command.Parameters.AddWithValue("seconds", durationSeconds);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
