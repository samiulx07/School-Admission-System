using System.Runtime.CompilerServices;

namespace SchoolAdmission.IntegrationTests.Support;

public sealed class IntegrationFactAttribute : FactAttribute
{
    public IntegrationFactAttribute([CallerFilePath] string? sourceFilePath = null, [CallerLineNumber] int sourceLineNumber = 0)
        : base(sourceFilePath, sourceLineNumber)
    {
        if (!IntegrationEnvironment.HasApi || !IntegrationEnvironment.HasDatabase)
        {
            Skip = "Requires isolated TEST_API_URL and TEST_DB_CONNECTION_STRING settings; run the Docker integration-test profile.";
        }
    }
}
