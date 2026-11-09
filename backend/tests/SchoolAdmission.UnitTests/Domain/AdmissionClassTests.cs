using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.UnitTests.Domain;

public sealed class AdmissionClassTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\0")]
    [InlineData("Class 6\0 - Morning")]
    public void CreateRejectsMissingNames(string? name)
    {
        Assert.ThrowsAny<ArgumentException>(() => AdmissionClass.Create(name!, 10, DateTimeOffset.UtcNow));
    }

    [Fact]
    public void CreateRejectsNamesLongerThanTwoHundredCharacters()
    {
        Assert.ThrowsAny<ArgumentException>(() => AdmissionClass.Create(new string('a', 201), 10, DateTimeOffset.UtcNow));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void CreateRejectsNonpositiveCapacity(int capacity)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => AdmissionClass.Create("Class 6 - Morning", capacity, DateTimeOffset.UtcNow));
    }

    [Fact]
    public void CreateTrimsTheNameAndStoresTimeInUtc()
    {
        var createdAt = new DateTimeOffset(2026, 11, 1, 10, 0, 0, TimeSpan.FromHours(6));

        var admissionClass = AdmissionClass.Create("  Class 6 - Morning  ", 120, createdAt);

        Assert.Equal("Class 6 - Morning", admissionClass.Name);
        Assert.Equal(120, admissionClass.TotalSeats);
        Assert.Equal(createdAt.ToUniversalTime(), admissionClass.CreatedAt);
        Assert.Equal(TimeSpan.Zero, admissionClass.CreatedAt.Offset);
    }
}
