using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.UnitTests.Domain;

public sealed class StudentIdTests
{
    [Fact]
    public void ParsePreservesLeadingZeros()
    {
        var studentId = StudentId.Parse("00152691234567890");

        Assert.Equal("00152691234567890", studentId.Value);
        Assert.Equal("00152691234567890", studentId.ToString());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("2015269123456789")]
    [InlineData("201526912345678900")]
    [InlineData("2015269123456789a")]
    [InlineData("２０１５２６９１２３４５６７８９０")]
    [InlineData("২০১৫২৬৯১২৩৪৫৬৭৮৯০")]
    [InlineData(" 0152691234567890")]
    [InlineData("20152691234567890 ")]
    public void ParseRejectsIdentifiersThatAreNotSeventeenAsciiDigits(string? value)
    {
        Assert.ThrowsAny<ArgumentException>(() => StudentId.Parse(value!));
    }
}
