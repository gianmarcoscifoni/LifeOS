using Microsoft.EntityFrameworkCore;
using LifeOS.Api.Data;
using LifeOS.Api.Models;
using LifeOS.Api.Services;

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

        // ── Save pre-parsed Q&A (called by Next.js route after Claude) ──────
        group.MapPost("/{id:guid}/qa", async (
            Guid id,
            SaveQARequest req,
            LifeOsDbContext db) =>
        {
            var iv = await db.Interviews.FindAsync(id);
            if (iv is null) return Results.NotFound();

            var old = db.InterviewQAs.Where(q => q.InterviewId == id);
            db.InterviewQAs.RemoveRange(old);

            var qaList = req.Pairs.Select((p, idx) => new InterviewQA
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
        }).WithName("SaveQAPairs");

        // ── Import transcript → Claude → Q&A pairs (legacy/direct) ──────────
        group.MapPost("/{id:guid}/import", async (
            Guid id,
            ImportTranscriptRequest req,
            LifeOsDbContext db,
            ClaudeService claude) =>
        {
            var iv = await db.Interviews.FindAsync(id);
            if (iv is null) return Results.NotFound();

            List<LifeOS.Api.DTOs.InterviewQaParsed> pairs;
            try
            {
                pairs = await claude.ParseInterviewTranscript(req.RawTranscript, iv.Company, iv.Role);
            }
            catch (Exception ex)
            {
                return Results.Problem($"Claude parsing failed: {ex.Message}");
            }

            if (pairs.Count == 0) return Results.Problem("No Q&A pairs extracted from transcript");

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

public record SaveQAPairItem(
    string Question,
    string Answer,
    string? Topic,
    int? QualityScore,
    string? AiFeedback);

public record SaveQARequest(List<SaveQAPairItem> Pairs);
