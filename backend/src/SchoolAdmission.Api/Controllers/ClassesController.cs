using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Application.Classes;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("classes")]
[Tags("Classes")]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status500InternalServerError)]
public sealed class ClassesController(ClassService classes) : ControllerBase
{
    [HttpPost]
    [EndpointName("CreateClass")]
    [EndpointSummary("Create a class with its seat capacity")]
    [EndpointDescription("Each shift is a separate class. Supply a name whose trimmed value contains 1 to 200 characters without NUL, " +
        "and a positive 32-bit totalSeats value. Surrounding name whitespace is removed. " +
        "The response includes a Location header for the new class. Initial held and confirmed counts are zero.")]
    [ProducesResponseType<CreatedClass>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
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
    [EndpointName("ListClasses")]
    [EndpointSummary("List classes and their current seat counts")]
    [EndpointDescription("Returns an array, including an empty array when there are no classes. " +
        "Each class includes total, confirmed, held and available seats. Expired pending holds do not occupy seats. " +
        "This is a public read. Availability can change as other students apply.")]
    [ProducesResponseType<IReadOnlyList<ClassSummary>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ClassSummary>>> List(CancellationToken cancellationToken) =>
        Ok(await classes.ListAsync(cancellationToken));

    [HttpGet("{classId}")]
    [EndpointName("GetClass")]
    [EndpointSummary("Get one class and its current seat counts")]
    [EndpointDescription("Returns the same seat summary used in the class list. Supply the class UUID returned by class creation. " +
        "Malformed UUIDs return 400 and missing classes return 404. This is a public read.")]
    [ProducesResponseType<ClassSummary>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ClassSummary>> Get(Guid classId, CancellationToken cancellationToken)
    {
        var result = await classes.GetAsync(classId, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : ApplicationProblems.FromError(this, result.Error!);
    }
}

public sealed record CreateClassRequest(string? Name, int TotalSeats);
