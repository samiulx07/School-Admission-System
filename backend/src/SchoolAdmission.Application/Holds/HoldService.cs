using SchoolAdmission.Application.Common;
using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.Application.Holds;

public sealed class HoldService(IClassAdmissionTransactions transactions, IHoldQueries queries, HoldPolicy policy)
{
    public Task<UseCaseResult<ConfirmedHold>> ConfirmAsync(Guid holdId, StudentId studentId,
        CancellationToken cancellationToken) =>
        WithOwnedHoldAsync(holdId, studentId, (hold, evaluatedAt) =>
        {
            if (hold.Status == HoldStatus.Confirmed)
            {
                return UseCaseResult<ConfirmedHold>.Success(new ConfirmedHold(hold.Id, "CONFIRMED"));
            }

            if (hold.GetEffectiveStatus(evaluatedAt) != HoldStatus.Held)
            {
                return UseCaseResult<ConfirmedHold>.Failure(new ApplicationError(ErrorKind.Conflict,
                    "hold_not_confirmable", "Only an unexpired pending hold can be confirmed."));
            }

            hold.Confirm(evaluatedAt);
            return UseCaseResult<ConfirmedHold>.Success(new ConfirmedHold(hold.Id, "CONFIRMED"));
        }, cancellationToken);

    public Task<UseCaseResult<bool>> CancelAsync(Guid holdId, StudentId studentId,
        CancellationToken cancellationToken) =>
        WithOwnedHoldAsync(holdId, studentId, (hold, evaluatedAt) =>
        {
            if (hold.Status == HoldStatus.Cancelled)
            {
                return UseCaseResult<bool>.Success(false);
            }

            if (hold.GetEffectiveStatus(evaluatedAt) != HoldStatus.Held)
            {
                return UseCaseResult<bool>.Failure(new ApplicationError(ErrorKind.Conflict,
                    "hold_not_cancellable", "Only an unexpired pending hold can be cancelled."));
            }

            return UseCaseResult<bool>.Success(hold.Cancel(evaluatedAt));
        }, cancellationToken);

    public Task<UseCaseResult<ReservedHold>> ReserveAsync(Guid classId, StudentId studentId,
        CancellationToken cancellationToken) =>
        transactions.ExecuteAsync<ReservedHold>(classId, async (session, token) =>
        {
            var active = await session.FindActiveForStudentAsync(studentId, token);
            if (active is not null)
            {
                return UseCaseResult<ReservedHold>.Failure(new ApplicationError(ErrorKind.Conflict,
                    "active_application_exists", "This student already has an active application for this class."));
            }

            var allocated = await session.CountAllocatedSeatsAsync(token);
            if (allocated >= session.Class.TotalSeats)
            {
                return UseCaseResult<ReservedHold>.Failure(new ApplicationError(ErrorKind.Conflict,
                    "class_full", "All seats in this class are currently held or confirmed."));
            }

            var hold = SeatHold.Create(classId, studentId, session.EvaluatedAt, policy.Duration);
            session.Add(hold);
            return UseCaseResult<ReservedHold>.Success(new ReservedHold(hold.Id, hold.ClassId, hold.StudentId.Value,
                HoldStatusNames.Format(hold.Status), hold.ExpiresAt, hold.CreatedAt, session.EvaluatedAt));
        }, cancellationToken);

    public async Task<UseCaseResult<HoldDetails>> GetAsync(Guid holdId, CancellationToken cancellationToken)
    {
        var hold = await queries.FindAsync(holdId, cancellationToken);
        return hold is null
            ? UseCaseResult<HoldDetails>.Failure(new ApplicationError(ErrorKind.NotFound,
                "hold_not_found", "The requested hold does not exist."))
            : UseCaseResult<HoldDetails>.Success(hold);
    }

    public Task<IReadOnlyList<StudentHold>> ListForStudentAsync(StudentId studentId,
        CancellationToken cancellationToken) => queries.ListForStudentAsync(studentId, cancellationToken);

    private async Task<UseCaseResult<T>> WithOwnedHoldAsync<T>(Guid holdId, StudentId studentId,
        Func<SeatHold, DateTimeOffset, UseCaseResult<T>> operation, CancellationToken cancellationToken)
    {
        var classId = await queries.FindClassIdAsync(holdId, cancellationToken);
        if (classId is null)
        {
            return UseCaseResult<T>.Failure(new ApplicationError(ErrorKind.NotFound,
                "hold_not_found", "The requested hold does not exist."));
        }

        return await transactions.ExecuteAsync<T>(classId.Value, async (session, token) =>
        {
            // Obtain only the immutable class ID first; reload mutable state after the class lock.
            var hold = await session.FindHoldAsync(holdId, token);
            if (hold is null)
            {
                return UseCaseResult<T>.Failure(new ApplicationError(ErrorKind.NotFound,
                    "hold_not_found", "The requested hold does not exist."));
            }

            if (hold.StudentId != studentId)
            {
                return UseCaseResult<T>.Failure(new ApplicationError(ErrorKind.Forbidden,
                    "hold_not_owned", "Only the student who reserved this hold can change it."));
            }

            return operation(hold, session.EvaluatedAt);
        }, cancellationToken);
    }
}
