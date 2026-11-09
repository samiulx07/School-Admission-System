using System.Runtime.CompilerServices;

namespace SchoolAdmission.IntegrationTests.Support;

public sealed class ExpiryIntegrationFactAttribute : FactAttribute
{
    public ExpiryIntegrationFactAttribute([CallerFilePath] string? sourceFilePath = null, [CallerLineNumber] int sourceLineNumber = 0)
        : base(sourceFilePath, sourceLineNumber)
    {
        if (!IntegrationEnvironment.HasApi || !IntegrationEnvironment.HasExpiryApi || !IntegrationEnvironment.HasDatabase)
        {
            Skip = "Requires TEST_EXPIRY_API_URL with three-second holds and the isolated integration-test environment.";
        }
    }
}
