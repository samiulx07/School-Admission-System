using System.Net;
using System.Text.Json;
using SchoolAdmission.IntegrationTests.Support;

namespace SchoolAdmission.IntegrationTests;

public sealed class ApiDocumentationTests
{
    [IntegrationFact]
    public async Task SwaggerAndItsBundledAssetsLoadWithTheGeneratedDocument()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        using var response = await api.SendAsync(HttpMethod.Get, "/openapi/v1.json", cancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        Assert.StartsWith("3.1.", document.RootElement.GetProperty("openapi").GetString());
        Assert.Equal("Seatwise Admissions API", document.RootElement.GetProperty("info").GetProperty("title").GetString());

        foreach (var path in new[] { "/swagger/index.html", "/swagger/swagger-ui.css", "/swagger/swagger-ui-bundle.js" })
        {
            using var asset = await api.SendAsync(HttpMethod.Get, path, cancellationToken);
            Assert.Equal(HttpStatusCode.OK, asset.StatusCode);
            Assert.True(asset.Content.Headers.ContentLength is null or > 0);
        }
    }

    [IntegrationFact]
    public async Task DocumentationCanBeDisabledForAnApiInstance()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient(ApiTarget.Secondary);
        foreach (var path in new[] { "/swagger/index.html", "/openapi/v1.json" })
        {
            using var response = await api.SendAsync(HttpMethod.Get, path, cancellationToken);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }
}
