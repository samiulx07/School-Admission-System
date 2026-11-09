using SchoolAdmission.Application.Common;
using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.Api.Identity;

internal static class StudentIdentity
{
    public static UseCaseResult<StudentId> Read(HttpRequest request)
    {
        if (request.Headers.TryGetValue("X-Student-Id", out var values) && values.Count == 1)
        {
            try
            {
                return UseCaseResult<StudentId>.Success(StudentId.Parse(values[0]!));
            }
            catch (ArgumentException)
            {
                // Present but malformed identifiers share the same response as missing or multiple values.
            }
        }

        return UseCaseResult<StudentId>.Failure(new ApplicationError(ErrorKind.Validation,
            "invalid_student_id", "Provide one X-Student-Id header containing exactly 17 ASCII digits."));
    }
}
