using System.Data;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Application.Common;
using SchoolAdmission.Application.Holds;
using SchoolAdmission.Domain.Admissions;
using SchoolAdmission.Infrastructure.Persistence;

namespace SchoolAdmission.Infrastructure.Holds;

internal sealed class HoldExpiryStore(AdmissionsDbContext database, IAdmissionClock clock) : IHoldExpiryStore
{
    public async Task<HoldExpiryBatch> ExpireBatchAsync(int classLimit, CancellationToken cancellationToken)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(classLimit);

        await using var transaction = await database.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted,
            cancellationToken);

        // Lock parents first, as every admission writer does. Busy classes are left for another tick.
        var classIds = await database.Database.SqlQuery<Guid>($"""
            SELECT admission_class.id AS "Value"
            FROM admissions.classes AS admission_class
            WHERE EXISTS (
                SELECT 1 FROM admissions.holds AS hold
                WHERE hold.class_id = admission_class.id
                    AND hold.status = 'HELD' AND hold.expires_at <= statement_timestamp()
            )
            ORDER BY admission_class.id
            LIMIT {classLimit}
            FOR UPDATE OF admission_class SKIP LOCKED
            """).ToArrayAsync(cancellationToken);

        if (classIds.Length == 0)
        {
            await transaction.CommitAsync(cancellationToken);
            return new HoldExpiryBatch(0, 0);
        }

        // Candidate selection time is only a hint; the expiry decision uses time after all class locks.
        var evaluatedAt = await clock.GetUtcNowAsync(cancellationToken);
        var expiredHolds = await database.Holds
            .Where(hold => classIds.Contains(hold.ClassId) && hold.Status == HoldStatus.Held
                && hold.ExpiresAt <= evaluatedAt)
            .ExecuteUpdateAsync(update => update.SetProperty(hold => hold.Status, HoldStatus.Expired), cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return new HoldExpiryBatch(classIds.Length, expiredHolds);
    }
}
