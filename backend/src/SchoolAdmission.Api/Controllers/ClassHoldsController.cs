using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Api.Identity;
using SchoolAdmission.Application.Holds;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("classes/{classId}/holds")]
public sealed class ClassHoldsController(HoldService holds) : ControllerBase
{
    [HttpPost]
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
