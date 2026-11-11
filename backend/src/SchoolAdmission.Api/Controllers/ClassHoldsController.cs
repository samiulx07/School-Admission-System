using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.Documentation;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Api.Identity;
using SchoolAdmission.Application.Holds;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("classes/{classId}/holds")]
[Tags("Reservations")]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status500InternalServerError)]
public sealed class ClassHoldsController(HoldService holds) : ControllerBase
{
    [HttpPost]
    [EndpointName("ReserveSeat")]
    [EndpointSummary("Reserve one available seat for a student")]
    [EndpointDescription("Send one X-Student-Id header and the class UUID. The request has an empty body. " +
        "A successful hold has status HELD, an expiry deadline and a Location header for its status endpoint. " +
        "The configured duration defaults to 600 seconds. serverNow is the database time used for the decision. " +
        "Capacity and student uniqueness are enforced across API instances. Exhausted capacity and an existing " +
        "HELD or CONFIRMED application for this student and class return 409. An expired or cancelled application permits reapplication.")]
    [StudentIdHeader]
    [ProducesResponseType<ReservedHold>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ReservedHold>> Reserve(Guid classId, CancellationToken cancellationToken)
    {
        var identity = StudentIdentity.Read(Request);
        if (!identity.IsSuccess)
        {
            return ApplicationProblems.FromError(this, identity.Error!);
        }

        var result = await holds.ReserveAsync(classId, identity.Value, cancellationToken);
        return result.IsSuccess
            ? CreatedAtAction(nameof(HoldsController.Get), "Holds", new { holdId = result.Value!.HoldId }, result.Value)
            : ApplicationProblems.FromError(this, result.Error!);
    }
}
