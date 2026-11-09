using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Api.Identity;
using SchoolAdmission.Application.Holds;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("holds")]
public sealed class HoldsController(HoldService holds) : ControllerBase
{
    [HttpPost("{holdId}/confirm")]
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
    public async Task<ActionResult<HoldDetails>> Get(Guid holdId, CancellationToken cancellationToken)
    {
        var result = await holds.GetAsync(holdId, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ApplicationProblems.FromError(this, result.Error!);
    }
}
