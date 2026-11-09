using SchoolAdmission.Application.Common;
using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.Application.Holds;

public interface IClassAdmissionTransactions
{
    /// <summary>
    /// Locks the class, obtains fresh database time after the lock, and retires elapsed pending holds
    /// before invoking the operation. Expected business failures still commit that expiry maintenance.
    /// </summary>
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
