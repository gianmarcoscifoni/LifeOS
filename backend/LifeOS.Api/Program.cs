using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Serilog;
using LifeOS.Api.Data;
using LifeOS.Api.Endpoints;
using LifeOS.Api.Middleware;
using LifeOS.Api.Services;

// Treat all DateTime as UTC — avoids Npgsql "Kind=Unspecified" errors
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ── Serilog ───────────────────────────────────────────────────────────
    builder.Host.UseSerilog((ctx, lc) => lc
        .ReadFrom.Configuration(ctx.Configuration)
        .WriteTo.Console());

    // ── Database ──────────────────────────────────────────────────────────
    builder.Services.AddDbContext<LifeOsDbContext>(opt =>
        opt.UseNpgsql(builder.Configuration.GetConnectionString("LifeOS")));

    // ── Services ──────────────────────────────────────────────────────────
    builder.Services.AddScoped<XpCalculatorService>();
    builder.Services.AddScoped<ClaudeService>();
    builder.Services.AddHostedService<WeeklyReviewService>();
    builder.Services.AddHttpClient<ClaudeService>();

    // ── CORS ──────────────────────────────────────────────────────────────
    builder.Services.AddCors(opt => opt.AddPolicy("frontend", p =>
        p.WithOrigins(builder.Configuration["FrontendUrl"] ?? "http://localhost:3000")
         .AllowAnyHeader()
         .AllowAnyMethod()));

    // ── OpenAPI (built-in .NET 10) ────────────────────────────────────────
    builder.Services.AddOpenApi();

    // ── Health checks ─────────────────────────────────────────────────────
    builder.Services.AddHealthChecks();

    // ── JSON snake_case ───────────────────────────────────────────────────
    builder.Services.ConfigureHttpJsonOptions(opt =>
    {
        opt.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
        opt.SerializerOptions.DictionaryKeyPolicy  = JsonNamingPolicy.SnakeCaseLower;
    });

    var app = builder.Build();

    // ── Auto-migrate on startup ───────────────────────────────────────────
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<LifeOS.Api.Data.LifeOsDbContext>();
        db.Database.Migrate();
    }

    // ── Middleware ────────────────────────────────────────────────────────
    app.UseSerilogRequestLogging();
    app.UseCors("frontend");
    app.UseMiddleware<ApiKeyAuthMiddleware>();

    if (app.Environment.IsDevelopment())
        app.MapOpenApi(); // serves /openapi/v1.json

    app.MapHealthChecks("/healthz");

    // ── Endpoints ─────────────────────────────────────────────────────────
    app.MapBrandEndpoints();
    app.MapCareerEndpoints();
    app.MapInterviewEndpoints();
    app.MapStreakEndpoints();
    app.MapHabitEndpoints();
    app.MapFinanceEndpoints();
    app.MapContentEndpoints();
    app.MapJournalEndpoints();
    app.MapClaudeEndpoints();
    app.MapDashboardEndpoints();
    app.MapXpEndpoints();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "LifeOS API failed to start.");
}
finally
{
    Log.CloseAndFlush();
}
