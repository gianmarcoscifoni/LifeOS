using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LifeOS.Api.Data;
using LifeOS.Api.Models;

namespace LifeOS.Api.Endpoints;

public static class InterviewEndpoints
{
    public static void MapInterviewEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/career/interviews").WithTags("Interviews");

        // ── List ──────────────────────────────────────────────────────────
        group.MapGet("/", async (LifeOsDbContext db) =>
        {
            var list = await db.Interviews
                .Include(i => i.QaPairs.OrderBy(q => q.SortOrder))
                .OrderByDescending(i => i.Date)
                .ToListAsync();
            return Results.Ok(list.Select(ToDto));
        }).WithName("GetInterviews");

        // ── Get one ───────────────────────────────────────────────────────
        group.MapGet("/{id:guid}", async (Guid id, LifeOsDbContext db) =>
        {
            var i = await db.Interviews
                .Include(x => x.QaPairs.OrderBy(q => q.SortOrder))
                .FirstOrDefaultAsync(x => x.Id == id);
            return i is null ? Results.NotFound() : Results.Ok(ToDto(i));
        }).WithName("GetInterview");

        // ── Create ────────────────────────────────────────────────────────
        group.MapPost("/", async (CreateInterviewRequest req, LifeOsDbContext db) =>
        {
            var iv = new Interview
            {
                Id        = Guid.NewGuid(),
                Company   = req.Company,
                Role      = req.Role,
                Date      = req.Date,
                Status    = req.Status ?? "scheduled",
                Notes     = req.Notes,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            db.Interviews.Add(iv);
            await db.SaveChangesAsync();
            return Results.Created($"/api/career/interviews/{iv.Id}", ToDto(iv));
        }).WithName("CreateInterview");

        // ── Update ────────────────────────────────────────────────────────
        group.MapPatch("/{id:guid}", async (Guid id, UpdateInterviewRequest req, LifeOsDbContext db) =>
        {
            var iv = await db.Interviews.FindAsync(id);
            if (iv is null) return Results.NotFound();
            if (req.Company is not null) iv.Company = req.Company;
            if (req.Role    is not null) iv.Role    = req.Role;
            if (req.Date    is not null) iv.Date    = req.Date.Value;
            if (req.Status  is not null) iv.Status  = req.Status;
            if (req.Notes   is not null) iv.Notes   = req.Notes;
            iv.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(ToDto(iv));
        }).WithName("UpdateInterview");

        // ── Delete ────────────────────────────────────────────────────────
        group.MapDelete("/{id:guid}", async (Guid id, LifeOsDbContext db) =>
        {
            var iv = await db.Interviews.FindAsync(id);
            if (iv is null) return Results.NotFound();
            db.Interviews.Remove(iv);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DeleteInterview");

        // ── Import transcript → Claude → Q&A pairs ───────────────────────
        group.MapPost("/{id:guid}/import", async (
            Guid id,
            ImportTranscriptRequest req,
            LifeOsDbContext db,
            IConfiguration config,
            HttpClient http) =>
        {
            var iv = await db.Interviews.FindAsync(id);
            if (iv is null) return Results.NotFound();

            var pairs = await ParseTranscriptWithClaude(req.RawTranscript, iv.Company, iv.Role, config, http);
            if (pairs is null) return Results.Problem("Claude parsing failed");

            // Remove old QA pairs for this interview before inserting new ones
            var old = db.InterviewQAs.Where(q => q.InterviewId == id);
            db.InterviewQAs.RemoveRange(old);

            var qaList = pairs.Select((p, idx) => new InterviewQA
            {
                Id           = Guid.NewGuid(),
                InterviewId  = id,
                Question     = p.Question,
                Answer       = p.Answer,
                Topic        = p.Topic,
                QualityScore = p.QualityScore,
                AiFeedback   = p.AiFeedback,
                SortOrder    = idx,
            }).ToList();

            db.InterviewQAs.AddRange(qaList);
            iv.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var updated = await db.Interviews
                .Include(x => x.QaPairs.OrderBy(q => q.SortOrder))
                .FirstAsync(x => x.Id == id);

            return Results.Ok(ToDto(updated));
        }).WithName("ImportTranscript");
    }

    // ── Claude Q&A extraction ─────────────────────────────────────────────

    private record ParsedQA(string Question, string Answer, string? Topic, int? QualityScore, string? AiFeedback);

    private static async Task<List<ParsedQA>?> ParseTranscriptWithClaude(
        string transcript, string company, string role,
        IConfiguration config, HttpClient http)
    {
        var apiKey = config["AnthropicApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey)) return null;

        var prompt = $"""
            You are analyzing an interview transcript for a {role} position at {company}.

            Extract all interviewer question + candidate answer pairs from the transcript below.
            Ignore filler text like "Thank you for watching", unintelligible audio artifacts, and off-topic conversation fragments.
            For each pair return a JSON object with:
            - "question": the interviewer's question (string, concise and clean)
            - "answer": the candidate's answer (string, cleaned up)
            - "topic": one of: Technical, Behavioral, Process, Security, Architecture, Soft Skills, Other
            - "quality_score": integer 1-5 rating of how strong the answer is (5=excellent, 1=weak/incomplete)
            - "ai_feedback": 1-sentence improvement suggestion (string, or null if the answer was excellent)

            Return ONLY valid JSON with this shape: {"pairs": [...]}
            No markdown, no explanation.

            TRANSCRIPT:
            {transcript}
            """;

        var body = JsonSerializer.Serialize(new
        {
            model      = "claude-sonnet-4-6",
            max_tokens = 4096,
            system     = "You are an expert technical interview coach. Extract structured Q&A data from raw transcripts. Always respond with valid JSON only.",
            messages   = new[] { new { role = "user", content = prompt } },
        });

        var req = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        req.Headers.Add("x-api-key", apiKey);
        req.Headers.Add("anthropic-version", "2023-06-01");

        var res = await http.SendAsync(req);
        if (!res.IsSuccessStatusCode) return null;

        var json = await res.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var text = doc.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString() ?? "{}";

        // Strip any accidental markdown code fence
        text = text.Trim();
        if (text.StartsWith("```")) text = text[(text.IndexOf('\n') + 1)..];
        if (text.EndsWith("```")) text = text[..text.LastIndexOf("```")];
        text = text.Trim();

        using var parsed = JsonDocument.Parse(text);
        var pairsEl = parsed.RootElement.GetProperty("pairs");

        return pairsEl.EnumerateArray().Select(el =>
        {
            var q  = el.GetProperty("question").GetString() ?? "";
            var a  = el.GetProperty("answer").GetString() ?? "";
            var t  = el.TryGetProperty("topic", out var tp) ? tp.GetString() : null;
            int? qs = el.TryGetProperty("quality_score", out var qse) && qse.ValueKind == JsonValueKind.Number
                ? qse.GetInt32() : null;
            var fb = el.TryGetProperty("ai_feedback", out var fbe) && fbe.ValueKind == JsonValueKind.String
                ? fbe.GetString() : null;
            return new ParsedQA(q, a, t, qs, fb);
        }).ToList();
    }

    // ── DTO ───────────────────────────────────────────────────────────────

    private static object ToDto(Interview i) => new
    {
        i.Id, i.Company, i.Role, i.Date, i.Status, i.Notes, i.CreatedAt, i.UpdatedAt,
        qa_pairs = i.QaPairs.Select(q => new
        {
            q.Id, q.InterviewId, q.Question, q.Answer,
            q.Topic, q.QualityScore, q.AiFeedback, q.SortOrder,
        }),
    };
}

// ── Request records ───────────────────────────────────────────────────────

public record CreateInterviewRequest(
    string Company,
    string Role,
    DateOnly Date,
    string? Status,
    string? Notes);

public record UpdateInterviewRequest(
    string? Company,
    string? Role,
    DateOnly? Date,
    string? Status,
    string? Notes);

public record ImportTranscriptRequest(string RawTranscript);
