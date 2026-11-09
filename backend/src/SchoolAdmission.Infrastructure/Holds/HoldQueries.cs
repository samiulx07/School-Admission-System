using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Application.Holds;
using SchoolAdmission.Domain.Admissions;
using SchoolAdmission.Infrastructure.Persistence;

namespace SchoolAdmission.Infrastructure.Holds;

internal sealed class HoldQueries(AdmissionsDbContext database) : IHoldQueries
{
    public async Task<HoldDetails?> FindAsync(Guid holdId, CancellationToken cancellationToken)
    {
        var hold = await database.Holds.AsNoTracking().Where(hold => hold.Id == holdId)
            .Select(hold => new
            {
                hold.Id,
                hold.ClassId,
                hold.Status,
                hold.ExpiresAt,
                hold.CreatedAt,
                ServerNow = DateTimeOffset.UtcNow
            }).SingleOrDefaultAsync(cancellationToken);
        return hold is null ? null : new HoldDetails(hold.Id, hold.ClassId,
            HoldStatusNames.Effective(hold.Status, hold.ExpiresAt, hold.ServerNow),
            hold.ExpiresAt, hold.CreatedAt, hold.ServerNow);
    }

    public async Task<IReadOnlyList<StudentHold>> ListForStudentAsync(StudentId studentId,
        CancellationToken cancellationToken)
    {
        var holds = await (from hold in database.Holds.AsNoTracking()
                           join admissionClass in database.Classes.AsNoTracking() on hold.ClassId equals admissionClass.Id
                           where hold.StudentId == studentId
                           orderby hold.CreatedAt descending, hold.Id descending
                           select new
                           {
                               hold.Id,
                               hold.ClassId,
                               ClassName = admissionClass.Name,
                               hold.Status,
                               hold.ExpiresAt,
                               hold.CreatedAt,
                               ServerNow = DateTimeOffset.UtcNow
                           }).ToListAsync(cancellationToken);
        return holds.Select(hold => new StudentHold(hold.Id, hold.ClassId, hold.ClassName,
            HoldStatusNames.Effective(hold.Status, hold.ExpiresAt, hold.ServerNow),
            hold.ExpiresAt, hold.CreatedAt, hold.ServerNow)).ToArray();
    }
}
