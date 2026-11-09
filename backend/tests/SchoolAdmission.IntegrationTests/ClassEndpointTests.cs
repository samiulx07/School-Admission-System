using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using SchoolAdmission.IntegrationTests.Support;

namespace SchoolAdmission.IntegrationTests;

public sealed class ClassEndpointTests
{
    [IntegrationFact]
    public async Task CreatedClassAppearsInPublicListAndDetailWithAllSeatCounts()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        var name = $"  Class 6 - Morning {Guid.NewGuid():N}  ";

        using var createResponse = await api.SendAsync(HttpMethod.Post, "/classes", cancellationToken, new { name, totalSeats = 7 });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        var id = created.GetProperty("id").GetGuid();
        Assert.NotEqual(Guid.Empty, id);
        Assert.Equal(name.Trim(), created.GetProperty("name").GetString());
        Assert.Equal(7, created.GetProperty("totalSeats").GetInt32());
        var location = createResponse.Headers.Location;
        Assert.NotNull(location);
        Assert.Equal($"/classes/{id}", location.IsAbsoluteUri ? location.AbsolutePath : location.OriginalString);

        // Both reads deliberately omit X-Student-Id, as specified by the public contract.
        using var detailResponse = await api.SendAsync(HttpMethod.Get, $"/classes/{id}", cancellationToken);
        Assert.Equal(HttpStatusCode.OK, detailResponse.StatusCode);
        var detail = await detailResponse.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        AssertInitialSeatSummary(detail, id, name.Trim(), 7);

        using var listResponse = await api.SendAsync(HttpMethod.Get, "/classes", cancellationToken);
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var classes = await listResponse.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        Assert.Equal(JsonValueKind.Array, classes.ValueKind);
        var entry = Assert.Single(classes.EnumerateArray(), item => item.GetProperty("id").GetGuid() == id);
        AssertInitialSeatSummary(entry, id, name.Trim(), 7);
    }

    [IntegrationFact]
    public async Task InvalidClassRequestsReturnReadableBadRequests()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        object[] invalidRequests =
        [
            new { name = "", totalSeats = 10 },
            new { name = "   ", totalSeats = 10 },
            new { name = new string('x', 201), totalSeats = 10 },
            new { name = "Class 6", totalSeats = 0 },
            new { name = "Class 6", totalSeats = -1 },
            new { name = "Missing capacity" },
            new { totalSeats = 10 },
            new { name = (string?)null, totalSeats = 10 },
            new { name = 123, totalSeats = 10 },
            new { name = "Fractional capacity", totalSeats = 1.5 },
            new { name = "Overflow capacity", totalSeats = (long)int.MaxValue + 1 }
        ];

        foreach (var request in invalidRequests)
        {
            using var response = await api.SendAsync(HttpMethod.Post, "/classes", cancellationToken, request);
            await ApiAssertions.ProblemAsync(response, HttpStatusCode.BadRequest, cancellationToken);
        }
    }

    [IntegrationFact]
    public async Task MissingAndMalformedClassIdsReturnTheirDocumentedErrors()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();

        using var missingResponse = await api.SendAsync(HttpMethod.Get, $"/classes/{Guid.NewGuid()}", cancellationToken);
        await ApiAssertions.ProblemAsync(missingResponse, HttpStatusCode.NotFound, cancellationToken);

        using var malformedResponse = await api.SendAsync(HttpMethod.Get, "/classes/not-a-uuid", cancellationToken);
        await ApiAssertions.ProblemAsync(malformedResponse, HttpStatusCode.BadRequest, cancellationToken);
    }

    private static void AssertInitialSeatSummary(JsonElement value, Guid id, string name, int totalSeats)
    {
        Assert.Equal(id, value.GetProperty("id").GetGuid());
        Assert.Equal(name, value.GetProperty("name").GetString());
        Assert.Equal(totalSeats, value.GetProperty("totalSeats").GetInt32());
        Assert.Equal(0, value.GetProperty("heldSeats").GetInt32());
        Assert.Equal(0, value.GetProperty("confirmedSeats").GetInt32());
        Assert.Equal(totalSeats, value.GetProperty("availableSeats").GetInt32());
    }

}
