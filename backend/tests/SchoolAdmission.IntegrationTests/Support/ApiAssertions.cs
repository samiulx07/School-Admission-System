using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace SchoolAdmission.IntegrationTests.Support;

internal static class ApiAssertions
{
    internal static async Task HoldStatusAsync(ApiTestClient api, Guid holdId, string expectedStatus, CancellationToken cancellationToken)
    {
        using var response = await api.SendAsync(HttpMethod.Get, $"/holds/{holdId}", cancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var hold = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        Assert.Equal(expectedStatus, hold.GetProperty("status").GetString());
    }

    internal static async Task ClassCountsAsync(ApiTestClient api, Guid classId, int held, int confirmed, int available, CancellationToken cancellationToken)
    {
        using var response = await api.SendAsync(HttpMethod.Get, $"/classes/{classId}", cancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var summary = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        Assert.Equal(held, summary.GetProperty("heldSeats").GetInt32());
        Assert.Equal(confirmed, summary.GetProperty("confirmedSeats").GetInt32());
        Assert.Equal(available, summary.GetProperty("availableSeats").GetInt32());
    }

    internal static async Task<JsonElement> ProblemAsync(HttpResponseMessage response, HttpStatusCode status, CancellationToken cancellationToken, string? code = null)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        Assert.Equal((int)status, problem.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(problem.GetProperty("title").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(problem.GetProperty("code").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(problem.GetProperty("traceId").GetString()));
        if (code is not null)
        {
            Assert.Equal(code, problem.GetProperty("code").GetString());
        }

        return problem;
    }
}
