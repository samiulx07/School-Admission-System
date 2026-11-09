using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.Application.Holds;

public sealed record HoldPolicy(TimeSpan Duration);

public sealed record ReservedHold(Guid HoldId, Guid ClassId, string StudentId, string Status,
    DateTimeOffset ExpiresAt, DateTimeOffset CreatedAt, DateTimeOffset ServerNow);

public sealed record HoldDetails(Guid HoldId, Guid ClassId, string Status,
    DateTimeOffset ExpiresAt, DateTimeOffset CreatedAt, DateTimeOffset ServerNow);

public sealed record StudentHold(Guid HoldId, Guid ClassId, string ClassName, string Status,
    DateTimeOffset ExpiresAt, DateTimeOffset CreatedAt, DateTimeOffset ServerNow);

public sealed record ConfirmedHold(Guid HoldId, string Status);

public static class HoldStatusNames
{
    public static string Format(HoldStatus status) => status switch
    {
        HoldStatus.Held => "HELD",
        HoldStatus.Confirmed => "CONFIRMED",
        HoldStatus.Expired => "EXPIRED",
        HoldStatus.Cancelled => "CANCELLED",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "Unknown hold status.")
    };

    public static string Effective(HoldStatus status, DateTimeOffset expiresAt, DateTimeOffset evaluatedAt) =>
        Format(status == HoldStatus.Held && expiresAt <= evaluatedAt ? HoldStatus.Expired : status);
}
