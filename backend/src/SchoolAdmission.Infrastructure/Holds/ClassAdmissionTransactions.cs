using System.Data;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Application.Common;
using SchoolAdmission.Application.Holds;
using SchoolAdmission.Domain.Admissions;
using SchoolAdmission.Infrastructure.Persistence;

namespace SchoolAdmission.Infrastructure.Holds;

internal sealed class ClassAdmissionTransactions(AdmissionsDbContext database, IAdmissionClock clock)
    : IClassAdmissionTransactions
{
    public async Task<UseCaseResult<T>> ExecuteAsync<T>(Guid classId,
        Func<IClassAdmissionSession, CancellationToken, Task<UseCaseResult<T>>> operation,
        CancellationToken cancellationToken)
    {
        await using var transaction = await database.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted,
            cancellationToken);

        // All allocation writers acquire this lock first. No application-side lock or counter is involved.
        var classes = await database.Classes.FromSqlInterpolated($"""
            SELECT id, name, total_seats, created_at
            FROM admissions.classes WHERE id = {classId} FOR UPDATE
            """).ToListAsync(cancellationToken);
        if (classes.Count == 0)
        {
            return UseCaseResult<T>.Failure(new ApplicationError(ErrorKind.NotFound,
                "class_not_found", "The requested class does not exist."));
        }

        // PostgreSQL transaction timestamps precede lock waits. Obtain wall-clock time only after the lock.
        var evaluatedAt = await clock.GetUtcNowAsync(cancellationToken);

        // Flush this update before any replacement insert to release the partial unique index entry.
        await database.Holds.Where(hold => hold.ClassId == classId && hold.Status == HoldStatus.Held
                && hold.ExpiresAt <= evaluatedAt)
            .ExecuteUpdateAsync(update => update.SetProperty(hold => hold.Status, HoldStatus.Expired), cancellationToken);

        var session = new ClassAdmissionSession(database, classes[0], evaluatedAt);
        var result = await operation(session, cancellationToken);
        await database.SaveChangesAsync(cancellationToken);

        // Expected conflicts still commit expiry maintenance performed above.
        await transaction.CommitAsync(cancellationToken);
        return result;
    }
}

internal sealed class ClassAdmissionSession(AdmissionsDbContext database, AdmissionClass admissionClass,
    DateTimeOffset evaluatedAt) : IClassAdmissionSession
{
    public AdmissionClass Class { get; } = admissionClass;
    public DateTimeOffset EvaluatedAt { get; } = evaluatedAt;

    public Task<SeatHold?> FindActiveForStudentAsync(StudentId studentId, CancellationToken cancellationToken) =>
        database.Holds.SingleOrDefaultAsync(hold => hold.ClassId == Class.Id && hold.StudentId == studentId
            && (hold.Status == HoldStatus.Held || hold.Status == HoldStatus.Confirmed), cancellationToken);

    public Task<SeatHold?> FindHoldAsync(Guid holdId, CancellationToken cancellationToken) =>
        database.Holds.SingleOrDefaultAsync(hold => hold.ClassId == Class.Id && hold.Id == holdId, cancellationToken);

    public Task<int> CountAllocatedSeatsAsync(CancellationToken cancellationToken) =>
        database.Holds.CountAsync(hold => hold.ClassId == Class.Id
            && (hold.Status == HoldStatus.Held || hold.Status == HoldStatus.Confirmed), cancellationToken);

    public void Add(SeatHold hold)
    {
        if (hold.ClassId != Class.Id)
        {
            throw new InvalidOperationException("A hold must belong to the locked class.");
        }

        database.Holds.Add(hold);
    }
}
