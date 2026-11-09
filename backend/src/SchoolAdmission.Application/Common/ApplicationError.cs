namespace SchoolAdmission.Application.Common;

public enum ErrorKind
{
    Validation,
    NotFound,
    Forbidden,
    Conflict
}

public sealed record ApplicationError(ErrorKind Kind, string Code, string Message);
