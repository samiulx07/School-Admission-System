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

        foreach (var path in new[] { "/swagger", "/swagger/index.html", "/swagger/swagger-ui.css", "/swagger/swagger-ui-bundle.js" })
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

    [IntegrationFact]
    public async Task OpenApiDescribesEveryEndpointWithItsActualResponsesAndIdentityRequirements()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        using var response = await api.SendAsync(HttpMethod.Get, "/openapi/v1.json", cancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var paths = document.RootElement.GetProperty("paths");
        (string Path, string Method, string Id, int[] Codes, bool StudentHeader)[] expected =
        [
            ("/classes", "post", "CreateClass", [201, 400, 500], false),
            ("/classes", "get", "ListClasses", [200, 500], false),
            ("/classes/{classId}", "get", "GetClass", [200, 400, 404, 500], false),
            ("/classes/{classId}/holds", "post", "ReserveSeat", [201, 400, 404, 409, 500], true),
            ("/holds/{holdId}", "get", "GetHold", [200, 400, 404, 500], false),
            ("/holds/{holdId}/confirm", "post", "ConfirmHold", [200, 400, 403, 404, 409, 500], true),
            ("/holds/{holdId}", "delete", "CancelHold", [204, 400, 403, 404, 409, 500], true),
            ("/me/holds", "get", "ListStudentHolds", [200, 400, 500], true),
            ("/health/live", "get", "GetLiveness", [200, 500], false),
            ("/health/ready", "get", "GetReadiness", [200, 500, 503], false)
        ];
        Assert.Equal(expected.Length, paths.EnumerateObject().Sum(path => path.Value.EnumerateObject().Count()));

        foreach (var endpoint in expected)
        {
            var operation = paths.GetProperty(endpoint.Path).GetProperty(endpoint.Method);
            Assert.Equal(endpoint.Id, operation.GetProperty("operationId").GetString());
            Assert.False(string.IsNullOrWhiteSpace(operation.GetProperty("summary").GetString()));
            Assert.False(string.IsNullOrWhiteSpace(operation.GetProperty("description").GetString()));
            var responses = operation.GetProperty("responses");
            Assert.Equal(endpoint.Codes, responses.EnumerateObject().Select(item => int.Parse(item.Name,
                System.Globalization.CultureInfo.InvariantCulture)).Order().ToArray());
            Assert.Equal(endpoint.Id == "CreateClass", operation.TryGetProperty("requestBody", out _));

            var headers = operation.TryGetProperty("parameters", out var parameters)
                ? parameters.EnumerateArray().Where(parameter => parameter.GetProperty("in").GetString() == "header").ToArray()
                : [];
            Assert.Equal(endpoint.StudentHeader ? 1 : 0, headers.Length);
            if (endpoint.StudentHeader)
            {
                var header = Assert.Single(headers);
                Assert.Equal("X-Student-Id", header.GetProperty("name").GetString());
                Assert.True(header.GetProperty("required").GetBoolean());
                Assert.Equal("00123456789012345", header.GetProperty("example").GetString());
                var schema = header.GetProperty("schema");
                Assert.Equal("string", schema.GetProperty("type").GetString());
                Assert.Equal("^[0-9]{17}$", schema.GetProperty("pattern").GetString());
                Assert.Equal(17, schema.GetProperty("minLength").GetInt32());
                Assert.Equal(17, schema.GetProperty("maxLength").GetInt32());
            }

            foreach (var statusCode in endpoint.Codes)
            {
                var description = responses.GetProperty(statusCode.ToString(System.Globalization.CultureInfo.InvariantCulture));
                if (statusCode is 204 or 503)
                {
                    Assert.False(description.TryGetProperty("content", out _));
                }
                else if (statusCode >= 400)
                {
                    var error = description.GetProperty("content").GetProperty("application/problem+json");
                    Assert.NotEmpty(error.GetProperty("examples").EnumerateObject());
                    foreach (var example in error.GetProperty("examples").EnumerateObject())
                    {
                        var value = example.Value.GetProperty("value");
                        Assert.Equal(statusCode, value.GetProperty("status").GetInt32());
                        Assert.Equal(example.Name, value.GetProperty("code").GetString());
                        Assert.False(string.IsNullOrWhiteSpace(value.GetProperty("traceId").GetString()));
                    }
                }
                else
                {
                    Assert.True(description.GetProperty("content").GetProperty("application/json").TryGetProperty("example", out _));
                    if (statusCode == 201)
                    {
                        Assert.True(description.GetProperty("headers").TryGetProperty("Location", out _));
                    }
                }
            }
        }
    }

    [IntegrationFact]
    public async Task DocumentedSchemasAndExamplesPreserveJsonTypesCapacityAndPublicHoldPrivacy()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        using var api = new ApiTestClient();
        using var response = await api.SendAsync(HttpMethod.Get, "/openapi/v1.json", cancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var root = document.RootElement;
        var schemas = root.GetProperty("components").GetProperty("schemas");
        var request = schemas.GetProperty("CreateClassRequest").GetProperty("properties");
        Assert.Equal("string", request.GetProperty("name").GetProperty("type").GetString());
        Assert.Equal(1, request.GetProperty("totalSeats").GetProperty("minimum").GetInt32());
        Assert.Equal(int.MaxValue, request.GetProperty("totalSeats").GetProperty("maximum").GetInt32());

        var summary = schemas.GetProperty("ClassSummary");
        Assert.Contains(summary.GetProperty("required").EnumerateArray(), item => item.GetString() == "availableSeats");
        foreach (var name in new[] { "totalSeats", "heldSeats", "confirmedSeats", "availableSeats" })
        {
            Assert.Equal("integer", summary.GetProperty("properties").GetProperty(name).GetProperty("type").GetString());
        }
        var hold = schemas.GetProperty("HoldDetails").GetProperty("properties");
        Assert.False(hold.TryGetProperty("studentId", out _));
        Assert.Equal(new[] { "CANCELLED", "CONFIRMED", "EXPIRED", "HELD" },
            hold.GetProperty("status").GetProperty("enum").EnumerateArray().Select(item => item.GetString()).Order().ToArray());
        Assert.Equal("date-time", hold.GetProperty("expiresAt").GetProperty("format").GetString());
        Assert.Equal("uuid", hold.GetProperty("holdId").GetProperty("format").GetString());
        var problem = schemas.GetProperty("ProblemDetails").GetProperty("properties");
        Assert.True(problem.TryGetProperty("code", out _));
        Assert.True(problem.TryGetProperty("traceId", out _));
        Assert.Equal("array", problem.GetProperty("errors").GetProperty("additionalProperties").GetProperty("type").GetString());

        var paths = root.GetProperty("paths");
        var created = paths.GetProperty("/classes").GetProperty("post").GetProperty("requestBody")
            .GetProperty("content").GetProperty("application/json").GetProperty("example");
        Assert.Equal(JsonValueKind.Number, created.GetProperty("totalSeats").ValueKind);
        var classes = SuccessExample("/classes", "get", "200");
        Assert.Equal(JsonValueKind.Array, classes.ValueKind);
        var exampleClass = classes[0];
        Assert.Equal(exampleClass.GetProperty("totalSeats").GetInt32(),
            exampleClass.GetProperty("heldSeats").GetInt32() + exampleClass.GetProperty("confirmedSeats").GetInt32()
            + exampleClass.GetProperty("availableSeats").GetInt32());
        var reservation = SuccessExample("/classes/{classId}/holds", "post", "201");
        Assert.Equal("00123456789012345", reservation.GetProperty("studentId").GetString());
        Assert.Equal("HELD", reservation.GetProperty("status").GetString());
        Assert.False(SuccessExample("/holds/{holdId}", "get", "200").TryGetProperty("studentId", out _));
        Assert.Equal("CONFIRMED", SuccessExample("/holds/{holdId}/confirm", "post", "200").GetProperty("status").GetString());

        JsonElement SuccessExample(string path, string method, string code) => paths.GetProperty(path).GetProperty(method)
            .GetProperty("responses").GetProperty(code).GetProperty("content").GetProperty("application/json").GetProperty("example");
    }
}
