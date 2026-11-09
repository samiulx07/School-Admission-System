using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.Application.Holds;

public interface IHoldQueries
{
    Task<HoldDetails?> FindAsync(Guid holdId, CancellationToken cancellationToken);
    Task<IReadOnlyList<StudentHold>> ListForStudentAsync(StudentId studentId, CancellationToken cancellationToken);
}
