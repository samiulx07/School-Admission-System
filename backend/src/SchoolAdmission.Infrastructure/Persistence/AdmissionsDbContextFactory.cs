using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SchoolAdmission.Infrastructure.Persistence;

public sealed class AdmissionsDbContextFactory : IDesignTimeDbContextFactory<AdmissionsDbContext>
{
    public AdmissionsDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Migrations");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("ConnectionStrings__Migrations is required for EF design-time operations.");
        }
        var options = new DbContextOptionsBuilder<AdmissionsDbContext>()
            .UseNpgsql(connectionString, postgres => postgres.MigrationsHistoryTable("__EFMigrationsHistory", AdmissionsDbContext.Schema))
            .Options;
        return new AdmissionsDbContext(options);
    }
}
