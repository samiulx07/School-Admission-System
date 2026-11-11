using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.Documentation;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Api.Identity;
using SchoolAdmission.Application.Holds;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("me/holds")]
[Tags("Applications")]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status500InternalServerError)]
public sealed class StudentHoldsController(HoldService holds) : ControllerBase
{
    [HttpGet]
    [EndpointName("ListStudentHolds")]
    [EndpointSummary("List the current student's application history")]
    [EndpointDescription("Supply one X-Student-Id header. Returns an array of current and previous applications with their class names, " +
        "statuses and timestamps, including expired and cancelled records. A student with no applications receives an empty array. " +
        "The header identifies the student's records and preserves leading zeros.")]
    [StudentIdHeader]
    [ProducesResponseType<IReadOnlyList<StudentHold>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<StudentHold>>> List(CancellationToken cancellationToken)
    {
        var identity = StudentIdentity.Read(Request);
        return identity.IsSuccess
            ? Ok(await holds.ListForStudentAsync(identity.Value, cancellationToken))
            : ApplicationProblems.FromError(this, identity.Error!);
    }
}
