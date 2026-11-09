using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Application.Classes;
using SchoolAdmission.Application.Common;
using SchoolAdmission.Infrastructure.Classes;
using SchoolAdmission.Infrastructure.Persistence;

namespace SchoolAdmission.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<AdmissionsDbContext>(options => options.UseNpgsql(connectionString,
            postgres => postgres.MigrationsHistoryTable("__EFMigrationsHistory", AdmissionsDbContext.Schema)));
        services.AddScoped<IClassRepository, ClassRepository>();
        services.AddScoped<IAdmissionClock, DatabaseClock>();
        return services;
    }
}
