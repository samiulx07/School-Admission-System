namespace SchoolAdmission.Application.Common;

public interface IAdmissionClock
{
    Task<DateTimeOffset> GetUtcNowAsync(CancellationToken cancellationToken);
}
