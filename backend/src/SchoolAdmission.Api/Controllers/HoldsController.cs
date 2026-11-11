using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.Documentation;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Api.Identity;
using SchoolAdmission.Application.Holds;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("holds")]
[Tags("Applications")]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status500InternalServerError)]
public sealed class HoldsController(HoldService holds) : ControllerBase
{
    [HttpDelete("{holdId}")]
    [EndpointName("CancelHold")]
    [EndpointSummary("Cancel an owned pending hold and release its seat")]
    [EndpointDescription("Only the owner can cancel an unexpired HELD application. Supply its UUID and one X-Student-Id header. " +
        "Success returns 204 with an empty response body. Repeating the owner's successful cancellation also returns 204. " +
        "Confirmed or expired applications return 409 and another student's hold returns 403. " +
        "After cancellation, the student may reserve a new place if capacity is available.")]
    [StudentIdHeader]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Cancel(Guid holdId, CancellationToken cancellationToken)
    {
        var identity = StudentIdentity.Read(Request);
        if (!identity.IsSuccess)
        {
            return ApplicationProblems.FromError(this, identity.Error!);
        }

        var result = await holds.CancelAsync(holdId, identity.Value, cancellationToken);
        return result.IsSuccess ? NoContent() : ApplicationProblems.FromError(this, result.Error!);
    }

    [HttpPost("{holdId}/confirm")]
    [EndpointName("ConfirmHold")]
    [EndpointSummary("Confirm an owned hold before its deadline")]
    [EndpointDescription("Supply the hold UUID and one X-Student-Id header. The request has an empty body. " +
        "Only the owner can confirm an unexpired HELD application. Success returns status CONFIRMED. " +
        "Repeated confirmation by the owner returns the same successful result and allocates the seat once, " +
        "including after the original deadline. Ownership is checked before repeated-confirmation success. " +
        "Expired or cancelled holds return 409 and another student's hold returns 403. Confirmation simulates fee payment.")]
    [StudentIdHeader]
    [ProducesResponseType<ConfirmedHold>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ConfirmedHold>> Confirm(Guid holdId, CancellationToken cancellationToken)
    {
        var identity = StudentIdentity.Read(Request);
        if (!identity.IsSuccess)
        {
            return ApplicationProblems.FromError(this, identity.Error!);
        }

        var result = await holds.ConfirmAsync(holdId, identity.Value, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ApplicationProblems.FromError(this, result.Error!);
    }

    [HttpGet("{holdId}")]
    [EndpointName("GetHold")]
    [EndpointSummary("Get an application's current status and timestamps")]
    [EndpointDescription("Public status read using the hold UUID. The response contains HELD, CONFIRMED, EXPIRED or CANCELLED. " +
        "A pending hold reads as EXPIRED as soon as its deadline passes. The background worker also persists expiry without incoming requests. " +
        "serverNow supports countdown calibration. The response omits the student's registration number.")]
    [ProducesResponseType<HoldDetails>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HoldDetails>> Get(Guid holdId, CancellationToken cancellationToken)
    {
        var result = await holds.GetAsync(holdId, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ApplicationProblems.FromError(this, result.Error!);
    }
}
