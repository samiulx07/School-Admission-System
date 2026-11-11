using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.OpenApi;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Application.Classes;
using SchoolAdmission.Application.Holds;

namespace SchoolAdmission.Api.Documentation;

internal static class ApiDocumentationExamples
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly Guid ClassId = Guid.Parse("28a70ee5-271f-40ee-8f14-dd61a68cbca2");
    private static readonly Guid HoldId = Guid.Parse("a1189ba4-4412-4a96-bce8-261b0d86cc19");
    private static readonly DateTimeOffset CreatedAt = new(2026, 11, 11, 10, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset ExpiresAt = CreatedAt.AddMinutes(10);

    internal static JsonNode CreateClassRequest() => JsonSerializer.SerializeToNode(new
    {
        name = "Class 6 - Morning",
        totalSeats = 30
    }, JsonOptions)!;

    internal static JsonNode? Success(string? operationId)
    {
        object? value = operationId switch
        {
            "CreateClass" => new CreatedClass(ClassId, "Class 6 - Morning", 30),
            "ListClasses" => new[] { new ClassSummary(ClassId, "Class 6 - Morning", 30, 3, 7) },
            "GetClass" => new ClassSummary(ClassId, "Class 6 - Morning", 30, 3, 7),
            "ReserveSeat" => new ReservedHold(HoldId, ClassId, "00123456789012345", "HELD", ExpiresAt, CreatedAt, CreatedAt),
            "GetHold" => new HoldDetails(HoldId, ClassId, "HELD", ExpiresAt, CreatedAt, CreatedAt),
            "ConfirmHold" => new ConfirmedHold(HoldId, "CONFIRMED"),
            "ListStudentHolds" => new[] { new StudentHold(HoldId, ClassId, "Class 6 - Morning", "HELD", ExpiresAt, CreatedAt, CreatedAt) },
            "GetLiveness" => new { status = "healthy" },
            "GetReadiness" => new { status = "ready" },
            _ => null
        };
        return value is null ? null : JsonSerializer.SerializeToNode(value, JsonOptions);
    }

    internal static Dictionary<string, IOpenApiExample> Errors(string? operationId, int statusCode, bool hasStudentHeader)
    {
        var examples = new Dictionary<string, IOpenApiExample>();
        if (statusCode == StatusCodes.Status400BadRequest)
        {
            if (operationId == "CreateClass")
            {
                Add("invalid_class", "Provide a class name of 1 to 200 trimmed characters without NUL and a positive totalSeats value.");
            }
            if (hasStudentHeader)
            {
                Add("invalid_student_id", "Provide one X-Student-Id header containing exactly 17 ASCII digits.");
            }
            if (operationId != "ListStudentHolds")
            {
                Add("validation_failed", "The request contains a JSON or parameter binding error.");
                if (examples["validation_failed"].Value is JsonObject validation)
                {
                    validation.Remove("detail");
                    var field = operationId == "CreateClass" ? "$.totalSeats"
                        : operationId is "GetClass" or "ReserveSeat" ? "classId" : "holdId";
                    validation["errors"] = new JsonObject
                    {
                        [field] = new JsonArray("The supplied value could not be read.")
                    };
                }
            }
        }
        else if (statusCode == StatusCodes.Status403Forbidden)
        {
            Add("hold_not_owned", "Only the student who reserved this hold can change it.");
        }
        else if (statusCode == StatusCodes.Status404NotFound)
        {
            var isClass = operationId is "GetClass" or "ReserveSeat";
            Add(isClass ? "class_not_found" : "hold_not_found",
                isClass ? "The requested class does not exist." : "The requested hold does not exist.");
        }
        else if (statusCode == StatusCodes.Status409Conflict)
        {
            if (operationId == "ReserveSeat")
            {
                Add("class_full", "All seats in this class are currently held or confirmed.");
                Add("active_application_exists", "This student already has an active application for this class.");
            }
            else
            {
                var confirming = operationId == "ConfirmHold";
                Add(confirming ? "hold_not_confirmable" : "hold_not_cancellable",
                    confirming ? "Only an unexpired pending hold can be confirmed." : "Only an unexpired pending hold can be cancelled.");
            }
        }
        else if (statusCode == StatusCodes.Status500InternalServerError)
        {
            Add("unexpected_error", "Please retry the request. If the problem continues, share the trace ID.");
        }
        return examples;

        void Add(string code, string detail)
        {
            examples.Add(code, new OpenApiExample
            {
                Summary = code,
                Value = new JsonObject
                {
                    ["title"] = ApplicationProblems.Title(statusCode),
                    ["status"] = statusCode,
                    ["detail"] = detail,
                    ["code"] = code,
                    ["traceId"] = "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01"
                }
            });
        }
    }
}
