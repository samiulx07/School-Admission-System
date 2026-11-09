using SchoolAdmission.Application.Common;
using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.Application.Classes;

public sealed class ClassService(IClassRepository classes, IAdmissionClock clock)
{
    public async Task<UseCaseResult<CreatedClass>> CreateAsync(string? name, int totalSeats,
        CancellationToken cancellationToken)
    {
        if (!AdmissionClass.IsValidName(name) || totalSeats <= 0)
        {
            return UseCaseResult<CreatedClass>.Failure(new ApplicationError(ErrorKind.Validation,
                "invalid_class", "Provide a class name of 1–200 characters without NUL and a positive totalSeats value."));
        }

        var now = await clock.GetUtcNowAsync(cancellationToken);
        var admissionClass = AdmissionClass.Create(name, totalSeats, now);
        await classes.AddAsync(admissionClass, cancellationToken);
        return UseCaseResult<CreatedClass>.Success(new CreatedClass(admissionClass.Id, admissionClass.Name,
            admissionClass.TotalSeats));
    }

    public Task<IReadOnlyList<ClassSummary>> ListAsync(CancellationToken cancellationToken) =>
        classes.ListAsync(cancellationToken);

    public async Task<UseCaseResult<ClassSummary>> GetAsync(Guid classId, CancellationToken cancellationToken)
    {
        var admissionClass = await classes.FindAsync(classId, cancellationToken);
        return admissionClass is null
            ? UseCaseResult<ClassSummary>.Failure(new ApplicationError(ErrorKind.NotFound, "class_not_found",
                "The requested class does not exist."))
            : UseCaseResult<ClassSummary>.Success(admissionClass);
    }
}
