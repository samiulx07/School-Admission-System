namespace SchoolAdmission.Application.Holds;

public sealed class HoldExpiryService(IHoldExpiryStore store)
{
    public const int ClassBatchSize = 100;

    public Task<HoldExpiryBatch> ExpireBatchAsync(CancellationToken cancellationToken) =>
        store.ExpireBatchAsync(ClassBatchSize, cancellationToken);
}
