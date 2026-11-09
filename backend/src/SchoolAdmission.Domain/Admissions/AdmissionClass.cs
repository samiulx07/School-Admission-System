using System.Diagnostics.CodeAnalysis;

namespace SchoolAdmission.Domain.Admissions;

public sealed class AdmissionClass
{
    private AdmissionClass() { }

    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public int TotalSeats { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static bool IsValidName([NotNullWhen(true)] string? name) =>
        !string.IsNullOrWhiteSpace(name) && name.Trim().Length <= 200 && !name.Contains('\0');

    public static AdmissionClass Create(string name, int totalSeats, DateTimeOffset createdAt)
    {
        if (!IsValidName(name))
        {
            throw new ArgumentException("Class name must contain 1–200 characters and cannot contain NUL.", nameof(name));
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
