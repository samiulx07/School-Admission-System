using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace SchoolAdmission.Api.Errors;

internal sealed class UnexpectedExceptionHandler(
    IProblemDetailsService problemDetails,
    ILogger<UnexpectedExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception,
        CancellationToken cancellationToken)
    {
        logger.LogError(exception, "Request failed with trace {TraceId}", ApplicationProblems.TraceId(httpContext));
        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = ApplicationProblems.Title(StatusCodes.Status500InternalServerError),
                Detail = "Please retry the request. If the problem continues, share the trace ID.",
                Extensions =
                {
                    ["code"] = "unexpected_error",
                    ["traceId"] = ApplicationProblems.TraceId(httpContext)
                }
            }
        });
    }
}
