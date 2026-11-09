using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Application.Classes;
using SchoolAdmission.Domain.Admissions;
using SchoolAdmission.Infrastructure.Persistence;

namespace SchoolAdmission.Infrastructure.Classes;

internal sealed class ClassRepository(AdmissionsDbContext database) : IClassRepository
{
    public async Task AddAsync(AdmissionClass admissionClass, CancellationToken cancellationToken)
    {
        database.Classes.Add(admissionClass);
        await database.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ClassSummary>> ListAsync(CancellationToken cancellationToken) =>
        await Summaries(database.Classes.AsNoTracking()
                .OrderBy(admissionClass => admissionClass.Name).ThenBy(admissionClass => admissionClass.Id))
            .ToListAsync(cancellationToken);

    public Task<ClassSummary?> FindAsync(Guid classId, CancellationToken cancellationToken) =>
        Summaries(database.Classes.AsNoTracking().Where(admissionClass => admissionClass.Id == classId))
            .SingleOrDefaultAsync(cancellationToken);

    private IQueryable<ClassSummary> Summaries(IQueryable<AdmissionClass> classes) => classes
        .Select(admissionClass => new
        {
            admissionClass.Id,
            admissionClass.Name,
            admissionClass.TotalSeats,
            Held = database.Holds.Count(hold => hold.ClassId == admissionClass.Id
                && hold.Status == HoldStatus.Held && hold.ExpiresAt > DateTimeOffset.UtcNow),
            Confirmed = database.Holds.Count(hold => hold.ClassId == admissionClass.Id
                && hold.Status == HoldStatus.Confirmed)
        })
        .Select(admissionClass => new ClassSummary(admissionClass.Id, admissionClass.Name, admissionClass.TotalSeats,
            admissionClass.Held, admissionClass.Confirmed));
}
