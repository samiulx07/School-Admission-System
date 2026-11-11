using System.Text.Json.Nodes;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace SchoolAdmission.Api.Documentation;

internal sealed class AdmissionOperationTransformer : IOpenApiOperationTransformer
{
    public Task TransformAsync(OpenApiOperation operation, OpenApiOperationTransformerContext context,
        CancellationToken cancellationToken)
    {
        var hasStudentHeader = context.Description.ActionDescriptor.EndpointMetadata
            .OfType<StudentIdHeaderAttribute>().Any();
        if (hasStudentHeader)
        {
            operation.Parameters ??= [];
            operation.Parameters.Add(new OpenApiParameter
            {
                Name = "X-Student-Id",
                In = ParameterLocation.Header,
                Required = true,
                Description = "Provide one student birth registration number as 17 ASCII digits, preserving leading zeros. " +
                    "Missing, malformed or repeated values return 400 with code invalid_student_id.",
                Schema = AdmissionSchemaTransformer.CreateStudentIdSchema(),
                Example = JsonValue.Create("00123456789012345")
            });
        }

        if (operation.OperationId == "CreateClass" && operation.RequestBody?.Content is { } requestContent)
        {
            foreach (var mediaType in requestContent.Values)
            {
                mediaType.Example = ApiDocumentationExamples.CreateClassRequest();
            }
        }

        var responses = operation.Responses!;
        foreach (var (statusCode, responseMetadata) in responses.ToArray())
        {
            var response = new OpenApiResponse
            {
                Description = responseMetadata.Description,
                Content = responseMetadata.Content,
                Headers = responseMetadata.Headers,
                Links = responseMetadata.Links,
                Extensions = responseMetadata.Extensions
            };
            responses[statusCode] = response;
            if (statusCode is "204" or "503")
            {
                response.Description = statusCode == "204" ? "The hold is cancelled. The response body is empty."
                    : "The database or application schema is unavailable. The response body is empty.";
                response.Content?.Clear();
                continue;
            }

            var schema = response.Content?.Values.FirstOrDefault()?.Schema;
            if (statusCode.StartsWith('4') || statusCode.StartsWith('5'))
            {
                var status = int.Parse(statusCode, System.Globalization.CultureInfo.InvariantCulture);
                response.Description = ApplicationErrorDescription(status);
                response.Content = new Dictionary<string, OpenApiMediaType>
                {
                    ["application/problem+json"] = new()
                    {
                        Schema = schema,
                        Examples = ApiDocumentationExamples.Errors(operation.OperationId, status, hasStudentHeader)
                    }
                };
                continue;
            }

            if (operation.OperationId is "GetLiveness" or "GetReadiness")
            {
                schema = new OpenApiSchema
                {
                    Type = JsonSchemaType.Object,
                    Required = new HashSet<string>(["status"], StringComparer.Ordinal),
                    Properties = new Dictionary<string, IOpenApiSchema>
                    {
                        ["status"] = new OpenApiSchema { Type = JsonSchemaType.String }
                    }
                };
            }
            response.Content = new Dictionary<string, OpenApiMediaType>
            {
                ["application/json"] = new()
                {
                    Schema = schema,
                    Example = ApiDocumentationExamples.Success(operation.OperationId)
                }
            };
            if (statusCode == "201")
            {
                response.Headers ??= new Dictionary<string, IOpenApiHeader>();
                response.Headers["Location"] = new OpenApiHeader
                {
                    Description = "URL of the newly created class or hold.",
                    Schema = new OpenApiSchema { Type = JsonSchemaType.String, Format = "uri-reference" }
                };
            }
        }
        return Task.CompletedTask;
    }

    private static string ApplicationErrorDescription(int statusCode) => statusCode switch
    {
        400 => "Invalid JSON, parameters, class details or Student ID. See code and optional errors for the cause.",
        403 => "The supplied student registration number does not own this hold.",
        404 => "The class or application could not be found.",
        409 => "Capacity, student uniqueness or application lifecycle conflicts with this request.",
        _ => "An unexpected error occurred. Share traceId when reporting the problem."
    };
}
