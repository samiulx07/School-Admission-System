using System.Net.Http.Json;

namespace SchoolAdmission.IntegrationTests.Support;

internal sealed class ApiTestClient : IDisposable
{
    private readonly HttpClient client;

    internal ApiTestClient(bool secondary = false)
    {
        _ = IntegrationEnvironment.DatabaseConnectionString();
        client = new HttpClient
        {
            BaseAddress = IntegrationEnvironment.ApiUrl(secondary),
            Timeout = TimeSpan.FromSeconds(60)
        };
    }

    internal async Task<HttpResponseMessage> SendAsync(HttpMethod method, string path, CancellationToken cancellationToken, object? body = null, string? studentId = null)
    {
        using var request = new HttpRequestMessage(method, path);
        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        if (studentId is not null)
        {
            request.Headers.Add("X-Student-Id", studentId);
        }

        return await client.SendAsync(request, cancellationToken);
    }

    public void Dispose() => client.Dispose();
}
