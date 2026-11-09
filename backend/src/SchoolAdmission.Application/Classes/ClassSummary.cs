namespace SchoolAdmission.Application.Classes;

public sealed record ClassSummary(
    Guid Id,
    string Name,
    int TotalSeats,
    int HeldSeats,
    int ConfirmedSeats)
{
    public int AvailableSeats => TotalSeats - HeldSeats - ConfirmedSeats;
}

public sealed record CreatedClass(Guid Id, string Name, int TotalSeats);
