using SchoolAdmission.Application.Common;
using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.Application.Holds;

public interface IClassAdmissionTransactions
{
    Task<UseCaseResult<T>> ExecuteAsync<T>(Guid classId,
        Func<IClassAdmissionSession, CancellationToken, Task<UseCaseResult<T>>> operation,
        CancellationToken cancellationToken);
}

public interface IClassAdmissionSession
{
    AdmissionClass Class { get; }
    DateTimeOffset EvaluatedAt { get; }
    Task<SeatHold?> FindActiveForStudentAsync(StudentId studentId, CancellationToken cancellationToken);
    Task<SeatHold?> FindHoldAsync(Guid holdId, CancellationToken cancellationToken);
    Task<int> CountAllocatedSeatsAsync(CancellationToken cancellationToken);
    void Add(SeatHold hold);
}
