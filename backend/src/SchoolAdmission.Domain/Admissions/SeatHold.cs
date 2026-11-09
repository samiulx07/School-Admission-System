namespace SchoolAdmission.Domain.Admissions;

public sealed class SeatHold
{
    private SeatHold() { }

    public Guid Id { get; private set; }
    public Guid ClassId { get; private set; }
    public StudentId StudentId { get; private set; }
    public HoldStatus Status { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset ExpiresAt { get; private set; }

    public static SeatHold Create(Guid classId, StudentId studentId, DateTimeOffset createdAt, TimeSpan duration)
    {
        if (classId == Guid.Empty)
        {
            throw new ArgumentException("A class identifier is required.", nameof(classId));
        }

        _ = StudentId.Parse(studentId.Value);
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(duration, TimeSpan.Zero);
        var utcCreatedAt = createdAt.ToUniversalTime();

        return new SeatHold
        {
            Id = Guid.NewGuid(),
            ClassId = classId,
            StudentId = studentId,
            Status = HoldStatus.Held,
            CreatedAt = utcCreatedAt,
            ExpiresAt = utcCreatedAt.Add(duration)
        };
    }

    public HoldStatus GetEffectiveStatus(DateTimeOffset evaluatedAt) =>
        Status == HoldStatus.Held && ExpiresAt <= evaluatedAt ? HoldStatus.Expired : Status;

    public bool Expire(DateTimeOffset evaluatedAt)
    {
        if (Status != HoldStatus.Held || ExpiresAt > evaluatedAt)
        {
            return false;
        }

        Status = HoldStatus.Expired;
        return true;
    }

    public bool Confirm(DateTimeOffset evaluatedAt)
    {
        if (Status == HoldStatus.Confirmed)
        {
            return false;
        }

        if (GetEffectiveStatus(evaluatedAt) != HoldStatus.Held)
        {
            throw new InvalidOperationException("Only an unexpired pending hold can be confirmed.");
        }

        Status = HoldStatus.Confirmed;
        return true;
    }

    public bool Cancel(DateTimeOffset evaluatedAt)
    {
        if (Status == HoldStatus.Cancelled)
        {
            return false;
        }

        if (GetEffectiveStatus(evaluatedAt) != HoldStatus.Held)
        {
            throw new InvalidOperationException("Only an unexpired pending hold can be cancelled.");
        }

        Status = HoldStatus.Cancelled;
        return true;
    }
}
