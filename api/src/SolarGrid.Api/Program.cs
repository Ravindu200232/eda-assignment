/*
 * File:    Program.cs
 * Module:  Startup
 * Owner:   Ravindu
 * Purpose: Entry point of the Smart Solar Microgrid Trading API.
 *          Registers services and builds the HTTP request pipeline.
 */
using SolarGrid.Api.Data;
using SolarGrid.Api.Extensions;
using SolarGrid.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAppSettings(builder.Configuration);
builder.Services.AddApiControllers();
builder.Services.AddDataAccess();
builder.Services.AddBusinessServices();
builder.Services.AddJwtAuthentication();
builder.Services.AddSwaggerWithJwt();
builder.Services.AddWebAppCors(builder.Configuration);

var app = builder.Build();

app.UseMiddleware<ErrorHandlingMiddleware>();

if (app.Configuration.GetValue("App:EnableSwagger", true))
{
    app.UseSwagger();
    app.UseSwaggerUI(options => options.DocumentTitle = "Smart Solar Microgrid API");
    app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();
}

app.UseCors(ServiceSetup.CorsPolicyName);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Indexes and the default admin must exist before the first request.
await app.Services.InitialiseDatabaseAsync();

app.Run();

// Makes Program visible to the E2E test project (WebApplicationFactory).
public partial class Program { }
