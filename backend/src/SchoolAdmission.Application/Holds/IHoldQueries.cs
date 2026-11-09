using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.Application.Holds;

public interface IHoldQueries
{
    Task<Guid?> FindClassIdAsync(Guid holdId, CancellationToken cancellationToken);
    Task<HoldDetails?> FindAsync(Guid holdId, CancellationToken cancellationToken);
    Task<IReadOnlyList<StudentHold>> ListForStudentAsync(StudentId studentId, CancellationToken cancellationToken);
}
