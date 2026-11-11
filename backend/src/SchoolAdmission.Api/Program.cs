using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SchoolAdmission.Api.Configuration;
using SchoolAdmission.Api.Documentation;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Api.Workers;
using SchoolAdmission.Application.Classes;
using SchoolAdmission.Application.Holds;
using SchoolAdmission.Infrastructure;
using SchoolAdmission.Infrastructure.Persistence;

if (args.Contains("--healthcheck", StringComparer.Ordinal))
{
    using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
    try
    {
        using var response = await client.GetAsync("http://127.0.0.1:8080/health/ready");
        return response.IsSuccessStatusCode ? 0 : 1;
    }
    catch (HttpRequestException)
    {
        return 1;
    }
    catch (TaskCanceledException)
    {
        return 1;
    }
}

var migrate = args.Contains("--migrate", StringComparer.Ordinal);
var builder = WebApplication.CreateBuilder(args.Where(argument => argument != "--migrate").ToArray());
var connectionString = DatabaseConfiguration.RequireConnectionString(builder.Configuration, migrate ? "Migrations" : "Admissions");
builder.Services.AddInfrastructure(connectionString);

if (migrate)
{
    await using var migrationApp = builder.Build();
    await using var scope = migrationApp.Services.CreateAsyncScope();
    var database = scope.ServiceProvider.GetRequiredService<AdmissionsDbContext>();
    await database.Database.MigrateAsync();
    return 0;
}

// The assignment's literal environment variable takes precedence over the nested .NET setting.
var holdDurationAlias = Environment.GetEnvironmentVariable("HOLD_DURATION_SECONDS");
if (holdDurationAlias is not null)
{
    builder.Configuration[$"{AdmissionOptions.SectionName}:HoldDurationSeconds"] = holdDurationAlias;
}

var frontendOrigin = builder.Configuration["Cors:FrontendOrigin"] ?? "http://localhost:3000";
if (!Uri.TryCreate(frontendOrigin, UriKind.Absolute, out var frontendUri)
    || (frontendUri.Scheme != Uri.UriSchemeHttp && frontendUri.Scheme != Uri.UriSchemeHttps)
    || frontendOrigin != frontendUri.GetLeftPart(UriPartial.Authority))
{
    throw new InvalidOperationException("Cors:FrontendOrigin must be an HTTP(S) origin without a path or trailing slash.");
}

builder.Services.AddControllers().ConfigureApiBehaviorOptions(ApiBehaviorConfiguration.Configure);
var apiDocumentationEnabled = builder.Configuration.GetValue<bool?>("ApiDocumentation:Enabled")
    ?? builder.Environment.IsDevelopment();
if (apiDocumentationEnabled)
{
    builder.Services.AddApiDocumentation();
}
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<UnexpectedExceptionHandler>();
builder.Services.AddScoped<ClassService>();
builder.Services.AddScoped<HoldService>();
builder.Services.AddScoped<HoldExpiryService>();
builder.Services.AddHostedService<HoldExpiryWorker>();
builder.Services.AddSingleton(provider => new HoldPolicy(TimeSpan.FromSeconds(
    provider.GetRequiredService<IOptions<AdmissionOptions>>().Value.HoldDurationSeconds)));
builder.Services.AddOptions<AdmissionOptions>()
    .BindConfiguration(AdmissionOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(frontendOrigin).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();
if (apiDocumentationEnabled)
{
    app.MapApiDocumentation();
}
app.MapControllers();
app.MapGet("/health/live", () => Results.Ok(new { status = "healthy" }))
    .WithName("GetLiveness")
    .WithTags("Health")
    .WithSummary("Check whether the API process is running")
    .WithDescription("Returns 200 while the API process can handle requests. This check does not access the database.")
    .Produces(StatusCodes.Status200OK, typeof(object), "application/json")
    .ProducesProblem(StatusCodes.Status500InternalServerError);
app.MapGet("/health/ready", async (AdmissionsDbContext database, CancellationToken cancellationToken) =>
{
    try
    {
        var pending = await database.Database.GetPendingMigrationsAsync(cancellationToken);
        if (pending.Any())
        {
            return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
        }

        // Checking the application table detects a missing schema even if migration history was altered.
        _ = await database.Classes.AsNoTracking().OrderBy(admissionClass => admissionClass.Id)
            .Select(admissionClass => admissionClass.Id).Take(1)
            .ToListAsync(cancellationToken);
        return Results.Ok(new { status = "ready" });
    }
    catch (Exception exception) when (exception is Npgsql.NpgsqlException or InvalidOperationException)
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
})
    .WithName("GetReadiness")
    .WithTags("Health")
    .WithSummary("Check whether the API can serve database requests")
    .WithDescription("Checks applied migrations and access to the application tables. Returns 200 when ready, " +
        "or 503 with an empty body while the database or schema is unavailable.")
    .Produces(StatusCodes.Status200OK, typeof(object), "application/json")
    .Produces(StatusCodes.Status503ServiceUnavailable)
    .ProducesProblem(StatusCodes.Status500InternalServerError);

await app.RunAsync();
return 0;
