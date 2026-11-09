using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Application.Classes;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("classes")]
public sealed class ClassesController(ClassService classes) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<CreatedClass>> Create(CreateClassRequest request, CancellationToken cancellationToken)
    {
        var result = await classes.CreateAsync(request.Name, request.TotalSeats, cancellationToken);
        if (!result.IsSuccess)
        {
            return ApplicationProblems.FromError(this, result.Error!);
        }

        var created = result.Value!;
        return CreatedAtAction(nameof(Get), new { classId = created.Id }, created);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ClassSummary>>> List(CancellationToken cancellationToken) =>
        Ok(await classes.ListAsync(cancellationToken));

    [HttpGet("{classId}")]
    public async Task<ActionResult<ClassSummary>> Get(Guid classId, CancellationToken cancellationToken)
    {
        var result = await classes.GetAsync(classId, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ApplicationProblems.FromError(this, result.Error!);
    }
}

public sealed record CreateClassRequest(string? Name, int TotalSeats);
