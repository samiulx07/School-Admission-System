using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.UnitTests.Domain;

public sealed class SeatHoldTests
{
    private static readonly DateTimeOffset CreatedAt = new(2026, 11, 1, 4, 0, 0, TimeSpan.Zero);
    private static readonly TimeSpan Duration = TimeSpan.FromMinutes(10);

    [Fact]
    public void HoldExpiresExactlyAtTheBoundary()
    {
        var hold = CreateHold();

        Assert.Equal(HoldStatus.Held, hold.GetEffectiveStatus(hold.ExpiresAt.AddTicks(-1)));
        Assert.Equal(HoldStatus.Expired, hold.GetEffectiveStatus(hold.ExpiresAt));
        Assert.Equal(HoldStatus.Held, hold.Status);
        Assert.True(hold.Expire(hold.ExpiresAt));
        Assert.Equal(HoldStatus.Expired, hold.Status);
        Assert.False(hold.Expire(hold.ExpiresAt.AddMinutes(1)));
    }

    [Fact]
    public void WorkerCannotExpireAHoldBeforeItsDeadline()
    {
        var hold = CreateHold();

        Assert.False(hold.Expire(hold.ExpiresAt.AddTicks(-1)));
        Assert.Equal(HoldStatus.Held, hold.Status);
    }

    [Fact]
    public void ConfirmationRemainsIdempotentAfterTheOriginalDeadline()
    {
        var hold = CreateHold();

        Assert.True(hold.Confirm(hold.ExpiresAt.AddTicks(-1)));
        Assert.False(hold.Confirm(hold.ExpiresAt.AddDays(1)));
        Assert.False(hold.Expire(hold.ExpiresAt.AddDays(1)));
        Assert.Equal(HoldStatus.Confirmed, hold.GetEffectiveStatus(hold.ExpiresAt.AddDays(1)));
    }

    [Fact]
    public void ConfirmationAtTheDeadlineFails()
    {
        var hold = CreateHold();

        Assert.Throws<InvalidOperationException>(() => hold.Confirm(hold.ExpiresAt));
        Assert.Equal(HoldStatus.Expired, hold.GetEffectiveStatus(hold.ExpiresAt));
    }

    [Fact]
    public void CancelledHoldCannotBeConfirmedAndRepeatedCancellationIsIdempotent()
    {
        var hold = CreateHold();

        Assert.True(hold.Cancel(CreatedAt.AddMinutes(1)));
        Assert.False(hold.Cancel(hold.ExpiresAt.AddDays(1)));
        Assert.False(hold.Expire(hold.ExpiresAt.AddDays(1)));
        Assert.Throws<InvalidOperationException>(() => hold.Confirm(CreatedAt.AddMinutes(2)));
        Assert.Equal(HoldStatus.Cancelled, hold.Status);
    }

    [Fact]
    public void ConfirmedAdmissionCannotBeCancelled()
    {
        var hold = CreateHold();
        hold.Confirm(CreatedAt.AddMinutes(1));

        Assert.Throws<InvalidOperationException>(() => hold.Cancel(CreatedAt.AddMinutes(2)));
        Assert.Equal(HoldStatus.Confirmed, hold.Status);
    }

    [Fact]
    public void ExpiredHoldCannotBeCancelledOrConfirmed()
    {
        var hold = CreateHold();
        hold.Expire(hold.ExpiresAt);

        Assert.Throws<InvalidOperationException>(() => hold.Cancel(hold.ExpiresAt.AddSeconds(1)));
        Assert.Throws<InvalidOperationException>(() => hold.Confirm(hold.ExpiresAt.AddSeconds(1)));
        Assert.Equal(HoldStatus.Expired, hold.Status);
    }

    [Fact]
    public void CreationRequiresAClassAndValidStudent()
    {
        Assert.ThrowsAny<ArgumentException>(() => SeatHold.Create(Guid.Empty, StudentId.Parse("20152691234567890"), CreatedAt, Duration));
        Assert.ThrowsAny<ArgumentException>(() => SeatHold.Create(Guid.NewGuid(), default, CreatedAt, Duration));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void CreationRequiresAPositiveDuration(int seconds)
    {
        Assert.ThrowsAny<ArgumentException>(() => SeatHold.Create(Guid.NewGuid(), StudentId.Parse("20152691234567890"), CreatedAt, TimeSpan.FromSeconds(seconds)));
    }

    private static SeatHold CreateHold() => SeatHold.Create(Guid.NewGuid(), StudentId.Parse("20152691234567890"), CreatedAt, Duration);
}
