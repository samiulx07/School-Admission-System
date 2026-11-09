using System.Net.Http.Json;
using System.Text;

namespace SchoolAdmission.IntegrationTests.Support;

internal sealed class ApiTestClient : IDisposable
{
    private readonly HttpClient client;

    internal ApiTestClient(ApiTarget target = ApiTarget.Primary)
    {
        _ = IntegrationEnvironment.DatabaseConnectionString();
        client = new HttpClient(new SocketsHttpHandler { RequestHeaderEncodingSelector = (_, _) => Encoding.UTF8 })
        {
            BaseAddress = IntegrationEnvironment.ApiUrl(target),
            Timeout = TimeSpan.FromSeconds(60)
        };
    }

    internal async Task<HttpResponseMessage> SendAsync(HttpMethod method, string path, CancellationToken cancellationToken, object? body = null, string? studentId = null, IReadOnlyList<string>? studentIds = null)
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

        if (studentIds is not null)
        {
            request.Headers.Add("X-Student-Id", studentIds);
        }

        return await client.SendAsync(request, cancellationToken);
    }

    public void Dispose() => client.Dispose();
}
