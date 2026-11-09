using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Application.Holds;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("holds")]
public sealed class HoldsController(HoldService holds) : ControllerBase
{
    [HttpGet("{holdId}")]
    public async Task<ActionResult<HoldDetails>> Get(Guid holdId, CancellationToken cancellationToken)
    {
        var result = await holds.GetAsync(holdId, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ApplicationProblems.FromError(this, result.Error!);
    }
}
