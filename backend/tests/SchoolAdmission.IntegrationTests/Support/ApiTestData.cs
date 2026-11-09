using System.Globalization;
using System.Net;
using System.Net.Http.Json;

namespace SchoolAdmission.IntegrationTests.Support;

internal static class ApiTestData
{
    private static long studentSequence = DateTimeOffset.UtcNow.Ticks % 100_000_000_000_000_000L;

    internal static string NewStudentId() => Interlocked.Increment(ref studentSequence).ToString("D17", CultureInfo.InvariantCulture);

    internal static async Task<Guid> CreateClassAsync(ApiTestClient api, int totalSeats, CancellationToken cancellationToken, string? name = null)
    {
        using var response = await api.SendAsync(HttpMethod.Post, "/classes", cancellationToken,
            new { name = name ?? $"Integration class {Guid.NewGuid():N}", totalSeats });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<CreatedClass>(cancellationToken);
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.Id);
        return result.Id;
    }

    private sealed record CreatedClass(Guid Id, string Name, int TotalSeats);
}
