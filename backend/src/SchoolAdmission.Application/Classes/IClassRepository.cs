using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.Application.Classes;

public interface IClassRepository
{
    Task AddAsync(AdmissionClass admissionClass, CancellationToken cancellationToken);
    Task<IReadOnlyList<ClassSummary>> ListAsync(CancellationToken cancellationToken);
    Task<ClassSummary?> FindAsync(Guid classId, CancellationToken cancellationToken);
}
