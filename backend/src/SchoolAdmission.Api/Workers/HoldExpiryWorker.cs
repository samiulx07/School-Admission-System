using SchoolAdmission.Application.Holds;

namespace SchoolAdmission.Api.Workers;

internal sealed class HoldExpiryWorker(IServiceScopeFactory scopeFactory, ILogger<HoldExpiryWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));
        try
        {
            // Recover overdue persisted holds immediately, including after an application restart.
            await ExpireBatchAsync(stoppingToken);
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await ExpireBatchAsync(stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal host shutdown cancels both database work and the timer.
        }
    }

    private async Task ExpireBatchAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var service = scope.ServiceProvider.GetRequiredService<HoldExpiryService>();
            var batch = await service.ExpireBatchAsync(cancellationToken);
            if (batch.ExpiredHolds > 0)
            {
                logger.LogInformation("Expired {ExpiredHolds} pending holds across {LockedClasses} classes.",
                    batch.ExpiredHolds, batch.LockedClasses);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Failed to expire pending holds. The next worker tick will retry.");
        }
    }
}
