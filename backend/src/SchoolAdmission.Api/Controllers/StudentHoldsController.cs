using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Api.Identity;
using SchoolAdmission.Application.Holds;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("me/holds")]
public sealed class StudentHoldsController(HoldService holds) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StudentHold>>> List(CancellationToken cancellationToken)
    {
        var identity = StudentIdentity.Read(Request);
        return identity.IsSuccess
            ? Ok(await holds.ListForStudentAsync(identity.Value, cancellationToken))
            : ApplicationProblems.FromError(this, identity.Error!);
    }
}
