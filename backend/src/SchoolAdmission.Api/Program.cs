var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseExceptionHandler();
app.MapControllers();
app.MapGet("/health/live", () => Results.Ok(new { status = "healthy" }))
    .WithName("GetLiveness");

app.Run();
