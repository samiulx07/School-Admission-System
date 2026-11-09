using SchoolAdmission.Application.Common;
using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.Application.Holds;

public sealed class HoldService(IClassAdmissionTransactions transactions, IHoldQueries queries, HoldPolicy policy)
{
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
}
