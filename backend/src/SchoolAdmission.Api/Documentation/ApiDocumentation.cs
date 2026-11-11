using Microsoft.OpenApi;

namespace SchoolAdmission.Api.Documentation;

internal static class ApiDocumentation
{
    internal static IServiceCollection AddApiDocumentation(this IServiceCollection services)
    {
        services.AddOpenApi("v1", options =>
        {
            options.OpenApiVersion = OpenApiSpecVersion.OpenApi3_1;
            options.AddSchemaTransformer<AdmissionSchemaTransformer>();
            options.AddOperationTransformer<AdmissionOperationTransformer>();
            options.AddDocumentTransformer((document, _, _) =>
            {
                document.Info = new OpenApiInfo
                {
                    Title = "Seatwise Admissions API",
                    Version = "v1",
                    Description = "Create classes, inspect live capacity, reserve a seat, and manage student applications. " +
                        "A hold expires after the configured duration, which defaults to 600 seconds. " +
                        "Student registration numbers are 17-digit strings with leading zeros preserved. " +
                        "Use the IDs returned by your requests when trying the endpoints."
                };
                document.Servers = [new OpenApiServer { Url = "/" }];
                return Task.CompletedTask;
            });
        });
        return services;
    }

    internal static WebApplication MapApiDocumentation(this WebApplication app)
    {
        app.MapOpenApi();
        app.UseSwaggerUI(options =>
        {
            options.RoutePrefix = "swagger";
            options.DocumentTitle = "Seatwise API documentation";
            options.SwaggerEndpoint("../openapi/v1.json", "Seatwise Admissions API v1");
            options.ConfigObject.ValidatorUrl = null;
        });
        return app;
    }
}
