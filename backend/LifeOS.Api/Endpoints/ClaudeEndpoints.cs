using Microsoft.AspNetCore.Mvc;
using LifeOS.Api.DTOs;
using LifeOS.Api.Services;

namespace LifeOS.Api.Endpoints;

public static class ClaudeEndpoints
{
    public static void MapClaudeEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/claude").WithTags("Claude AI");

        /// <summary>
        /// Invia una domanda a Claude con il contesto completo del LifeOS (streaming SSE).
        /// </summary>
        group.MapPost("/ask",
            [ProducesResponseType(200)]
            [ProducesResponseType(400)]
            async (ClaudeAskRequest req, ClaudeService claude, HttpContext ctx) =>
            {
                if (string.IsNullOrWhiteSpace(req.Question))
                    return Results.BadRequest("La domanda non può essere vuota.");

                ctx.Response.Headers.ContentType = "text/event-stream";
                ctx.Response.Headers.CacheControl = "no-cache";
                ctx.Response.Headers.Connection = "keep-alive";

                await foreach (var chunk in claude.AskStream(req.Question))
                {
                    await ctx.Response.WriteAsync($"data: {chunk}\n\n");
                    await ctx.Response.Body.FlushAsync();
                }
                await ctx.Response.WriteAsync("data: [DONE]\n\n");
                return Results.Empty;
            })
            .WithName("AskClaude");

        /// <summary>
        /// Genera la review settimanale automatica e la salva nel diario.
        /// </summary>
        group.MapPost("/weekly-review",
            [ProducesResponseType<WeeklyReviewDto>(200)]
            async (ClaudeService claude) =>
            {
                var review = await claude.GenerateWeeklyReview();
                return Results.Ok(new WeeklyReviewDto(review, DateTime.UtcNow));
            })
            .WithName("GenerateWeeklyReview");
    }
}
