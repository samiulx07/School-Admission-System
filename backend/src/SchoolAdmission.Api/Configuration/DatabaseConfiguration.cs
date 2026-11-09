using Npgsql;

namespace SchoolAdmission.Api.Configuration;

internal static class DatabaseConfiguration
{
    public static string RequireConnectionString(IConfiguration configuration, string name)
    {
        var connectionString = configuration.GetConnectionString(name);
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException($"ConnectionStrings:{name} is required. No database fallback is configured.");
        }

        NpgsqlConnectionStringBuilder parsed;
        try
        {
            parsed = new NpgsqlConnectionStringBuilder(connectionString);
        }
        catch (ArgumentException)
        {
            throw new InvalidOperationException($"ConnectionStrings:{name} is not a valid PostgreSQL connection string.");
        }

        if (string.IsNullOrWhiteSpace(parsed.Host) || string.IsNullOrWhiteSpace(parsed.Database)
            || string.IsNullOrWhiteSpace(parsed.Username))
        {
            throw new InvalidOperationException($"ConnectionStrings:{name} must specify Host, Database and Username.");
        }

        if (parsed.Host.Contains("supabase.", StringComparison.OrdinalIgnoreCase)
            && parsed.SslMode != SslMode.VerifyFull)
        {
            throw new InvalidOperationException($"ConnectionStrings:{name} must use SSL Mode=VerifyFull for Supabase.");
        }

        return connectionString;
    }
}
