using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Application.Common;

namespace SchoolAdmission.Api.Errors;

internal static class ApplicationProblems
{
    public static ObjectResult FromError(ControllerBase controller, ApplicationError error)
    {
        var statusCode = error.Kind switch
        {
            ErrorKind.Validation => StatusCodes.Status400BadRequest,
            ErrorKind.NotFound => StatusCodes.Status404NotFound,
            ErrorKind.Forbidden => StatusCodes.Status403Forbidden,
            ErrorKind.Conflict => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status500InternalServerError
        };
        var response = controller.Problem(statusCode: statusCode, title: Title(statusCode), detail: error.Message);
        var details = (ProblemDetails)response.Value!;
        details.Extensions["code"] = error.Code;
        details.Extensions["traceId"] = TraceId(controller.HttpContext);
        return response;
    }

    public static string TraceId(HttpContext context) => Activity.Current?.Id ?? context.TraceIdentifier;

    public static string Title(int statusCode) => statusCode switch
    {
        StatusCodes.Status400BadRequest => "The request is invalid.",
        StatusCodes.Status403Forbidden => "This application belongs to another student.",
        StatusCodes.Status404NotFound => "The requested resource was not found.",
        StatusCodes.Status409Conflict => "The request conflicts with the current admission state.",
        _ => "An unexpected error occurred."
    };
}
