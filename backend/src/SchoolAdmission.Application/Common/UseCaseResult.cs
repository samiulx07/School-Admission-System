namespace SchoolAdmission.Application.Common;

public sealed class UseCaseResult<T>
{
    private UseCaseResult(T? value, ApplicationError? error)
    {
        Value = value;
        Error = error;
    }

    public T? Value { get; }
    public ApplicationError? Error { get; }
    public bool IsSuccess => Error is null;

    public static UseCaseResult<T> Success(T value) => new(value, null);
    public static UseCaseResult<T> Failure(ApplicationError error) => new(default, error);
}
