using Microsoft.AspNetCore.Mvc;

namespace SchoolAdmission.Api.Errors;

internal static class ApiBehaviorConfiguration
{
    public static void Configure(ApiBehaviorOptions options)
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var details = new ValidationProblemDetails(context.ModelState)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = ApplicationProblems.Title(StatusCodes.Status400BadRequest)
            };
            details.Extensions["code"] = "validation_failed";
            details.Extensions["traceId"] = ApplicationProblems.TraceId(context.HttpContext);
            return new BadRequestObjectResult(details);
        };
    }
}
