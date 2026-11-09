using Npgsql;

namespace SchoolAdmission.IntegrationTests.Support;

internal static class IntegrationEnvironment
{
    internal static bool HasDatabase => !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("TEST_DB_CONNECTION_STRING"));

    internal static bool HasApi => !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("TEST_API_URL"));

    internal static string DatabaseConnectionString()
    {
        var value = Environment.GetEnvironmentVariable("TEST_DB_CONNECTION_STRING");
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException("Set TEST_DB_CONNECTION_STRING to an isolated admissions_test database.");
        }

        var settings = new NpgsqlConnectionStringBuilder(value);
        if (!IsLocalDatabaseHost(settings.Host) || settings.Database?.StartsWith("admissions_test", StringComparison.Ordinal) != true)
        {
            throw new InvalidOperationException("Integration tests require a loopback or test-db host and a database whose name starts with admissions_test. Development and Supabase databases are not allowed.");
        }

        return settings.ConnectionString;
    }

    internal static Uri ApiUrl(bool secondary = false)
    {
        var variable = secondary ? "TEST_SECONDARY_API_URL" : "TEST_API_URL";
        var value = Environment.GetEnvironmentVariable(variable);
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            || (!uri.IsLoopback && uri.Host is not ("test-api" or "test-api-secondary"))
            || uri.AbsolutePath != "/"
            || !string.IsNullOrEmpty(uri.Query)
            || !string.IsNullOrEmpty(uri.Fragment)
            || !string.IsNullOrEmpty(uri.UserInfo))
        {
            throw new InvalidOperationException($"{variable} must be the root URL of an isolated loopback, test-api, or test-api-secondary server.");
        }

        return uri;
    }

    private static bool IsLocalDatabaseHost(string? host) => host is "localhost" or "127.0.0.1" or "::1" or "test-db";
}
