using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.Infrastructure.Persistence;

public sealed class AdmissionsDbContext(DbContextOptions<AdmissionsDbContext> options) : DbContext(options)
{
    public const string Schema = "admissions";

    public DbSet<AdmissionClass> Classes => Set<AdmissionClass>();
    public DbSet<SeatHold> Holds => Set<SeatHold>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(Schema);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AdmissionsDbContext).Assembly);
    }
}
