namespace SchoolAdmission.Domain.Admissions;

public sealed class AdmissionClass
{
    private AdmissionClass() { }

    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public int TotalSeats { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static AdmissionClass Create(string name, int totalSeats, DateTimeOffset createdAt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (name.Trim().Length > 200)
        {
            throw new ArgumentException("Class name must be at most 200 characters.", nameof(name));
        }

        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(totalSeats);

        return new AdmissionClass
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            TotalSeats = totalSeats,
            CreatedAt = createdAt.ToUniversalTime()
        };
    }
}
