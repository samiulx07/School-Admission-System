using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Application.Common;

namespace SchoolAdmission.Infrastructure.Persistence;

internal sealed class DatabaseClock(AdmissionsDbContext database) : IAdmissionClock
{
    public Task<DateTimeOffset> GetUtcNowAsync(CancellationToken cancellationToken) =>
        database.Database.SqlQuery<DateTimeOffset>($"SELECT clock_timestamp() AS \"Value\"")
            .SingleAsync(cancellationToken);
}
