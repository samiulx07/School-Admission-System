using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;
using SchoolAdmission.Api.Controllers;
using SchoolAdmission.Application.Classes;
using SchoolAdmission.Application.Holds;

namespace SchoolAdmission.Api.Documentation;

internal sealed class AdmissionSchemaTransformer : IOpenApiSchemaTransformer
{
    private static readonly HashSet<Type> ResponseTypes =
    [
        typeof(CreatedClass), typeof(ClassSummary), typeof(ReservedHold),
        typeof(HoldDetails), typeof(ConfirmedHold), typeof(StudentHold)
    ];

    public Task TransformAsync(OpenApiSchema schema, OpenApiSchemaTransformerContext context,
        CancellationToken cancellationToken)
    {
        var type = context.JsonTypeInfo.Type;
        if (type == typeof(CreateClassRequest))
        {
            schema.Properties!["name"] = new OpenApiSchema
            {
                Type = JsonSchemaType.String,
                MinLength = 1,
                Description = "Required. The trimmed name must contain 1 to 200 characters without NUL. Surrounding whitespace is removed."
            };
            if (schema.Properties["totalSeats"] is OpenApiSchema capacity)
            {
                capacity.Minimum = "1";
                capacity.Maximum = "2147483647";
                capacity.Pattern = null;
                capacity.Description = "Required positive 32-bit integer. The JSON reader also accepts a string containing that integer.";
            }
        }

        if (ResponseTypes.Contains(type))
        {
            schema.Required = new HashSet<string>(schema.Properties!.Keys, StringComparer.Ordinal);
            foreach (var (name, property) in schema.Properties)
            {
                if (property is OpenApiSchema { Format: "int32" } number)
                {
                    number.Type = JsonSchemaType.Integer;
                    number.Pattern = null;
                    number.Minimum = name == "totalSeats" ? "1" : "0";
                    number.Maximum = "2147483647";
                }
            }

            if (schema.Properties.ContainsKey("studentId"))
            {
                schema.Properties["studentId"] = CreateStudentIdSchema();
            }

            if (schema.Properties.TryGetValue("status", out var statusSchema) && statusSchema is OpenApiSchema status)
            {
                string[] values = type == typeof(ReservedHold) ? ["HELD"]
                    : type == typeof(ConfirmedHold) ? ["CONFIRMED"]
                    : ["HELD", "CONFIRMED", "EXPIRED", "CANCELLED"];
                status.Enum = values.Select(value => (JsonNode)JsonValue.Create(value)).ToList();
            }
        }

        if (type == typeof(ProblemDetails))
        {
            schema.Type = JsonSchemaType.Object;
            schema.Description = "API error. code is stable for client handling and traceId identifies the request. " +
                "Model binding errors also include an errors dictionary.";
            schema.Properties = new Dictionary<string, IOpenApiSchema>
            {
                ["type"] = new OpenApiSchema { Type = JsonSchemaType.String, Format = "uri-reference" },
                ["title"] = new OpenApiSchema { Type = JsonSchemaType.String },
                ["status"] = new OpenApiSchema { Type = JsonSchemaType.Integer, Format = "int32" },
                ["detail"] = new OpenApiSchema { Type = JsonSchemaType.String },
                ["instance"] = new OpenApiSchema { Type = JsonSchemaType.String, Format = "uri-reference" },
                ["code"] = new OpenApiSchema { Type = JsonSchemaType.String },
                ["traceId"] = new OpenApiSchema { Type = JsonSchemaType.String },
                ["errors"] = new OpenApiSchema
                {
                    Type = JsonSchemaType.Object,
                    AdditionalProperties = new OpenApiSchema
                    {
                        Type = JsonSchemaType.Array,
                        Items = new OpenApiSchema { Type = JsonSchemaType.String }
                    }
                }
            };
            schema.Required = new HashSet<string>(["title", "status", "code", "traceId"], StringComparer.Ordinal);
        }

        return Task.CompletedTask;
    }

    internal static OpenApiSchema CreateStudentIdSchema() => new()
    {
        Type = JsonSchemaType.String,
        MinLength = 17,
        MaxLength = 17,
        Pattern = "^[0-9]{17}$",
        Description = "Exactly 17 ASCII digits. Preserve leading zeros.",
        Examples = [JsonValue.Create("00123456789012345")]
    };
}
