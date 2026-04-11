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
        /// Invia un messaggio a Claude con il contesto completo del LifeOS (streaming SSE).
        /// </summary>
        group.MapPost("/ask",
            [ProducesResponseType(200)]
            [ProducesResponseType(400)]
            async (ClaudeAskRequest req, ClaudeService claude, HttpContext ctx) =>
            {
                if (string.IsNullOrWhiteSpace(req.Message))
                    return Results.BadRequest("Il messaggio non può essere vuoto.");

                ctx.Response.Headers.ContentType = "text/event-stream";
                ctx.Response.Headers.CacheControl = "no-cache";
                ctx.Response.Headers.Connection = "keep-alive";

                await foreach (var chunk in claude.AskStream(req.Message, req.History))
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

        /// <summary>
        /// Analizza una trascrizione vocale ed estrae keywords, topic, goals, mood e coaching message.
        /// </summary>
        group.MapPost("/analyze",
            [ProducesResponseType<TranscriptAnalysisDto>(200)]
            [ProducesResponseType(400)]
            async (TranscriptAnalysisRequest req, ClaudeService claude) =>
            {
                if (string.IsNullOrWhiteSpace(req.Transcript))
                    return Results.BadRequest("La trascrizione non può essere vuota.");

                var analysis = await claude.AnalyzeTranscript(req.Transcript);
                return Results.Ok(analysis);
            })
            .WithName("AnalyzeTranscript");
    }
}
