namespace SchoolAdmission.Domain.Admissions;

public readonly record struct StudentId
{
    private StudentId(string value) => Value = value;

    public string Value { get; }

    public static StudentId Parse(string value)
    {
        if (value is null || value.Length != 17 || value.Any(character => !char.IsAsciiDigit(character)))
        {
            throw new ArgumentException("Student ID must contain exactly 17 ASCII digits.", nameof(value));
        }

        return new StudentId(value);
    }

    public override string ToString() => Value ?? string.Empty;
}
