using System.Runtime.CompilerServices;

namespace SchoolAdmission.IntegrationTests.Support;

public sealed class DatabaseFactAttribute : FactAttribute
{
    public DatabaseFactAttribute([CallerFilePath] string? sourceFilePath = null, [CallerLineNumber] int sourceLineNumber = 0)
        : base(sourceFilePath, sourceLineNumber)
    {
        if (!IntegrationEnvironment.HasDatabase)
        {
            Skip = "Requires an isolated database through TEST_DB_CONNECTION_STRING; run the Docker integration-test profile.";
        }
    }
}
