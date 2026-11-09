namespace SchoolAdmission.Application.Holds;

public readonly record struct HoldExpiryBatch(int LockedClasses, int ExpiredHolds);

public interface IHoldExpiryStore
{
    Task<HoldExpiryBatch> ExpireBatchAsync(int classLimit, CancellationToken cancellationToken);
}
