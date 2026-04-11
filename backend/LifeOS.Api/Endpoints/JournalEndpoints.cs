using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LifeOS.Api.Data;
using LifeOS.Api.DTOs;
using LifeOS.Api.Models;

namespace LifeOS.Api.Endpoints;

public static class JournalEndpoints
{
    public static void MapJournalEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/journal").WithTags("Journal");

        /// <summary>
        /// Restituisce le voci del diario, ordinate per data decrescente.
        /// </summary>
        group.MapGet("/",
            [ProducesResponseType<List<JournalEntryDto>>(200)]
            async (LifeOsDbContext db, int limit = 50) =>
            {
                var list = await db.JournalEntries
                    .OrderByDescending(j => j.EntryDate)
                    .Take(limit)
                    .ToListAsync();
                return Results.Ok(list.Select(ToDto).ToList());
            })
            .WithName("GetJournalEntries");

        /// <summary>
        /// Crea una nuova voce nel diario.
        /// </summary>
        group.MapPost("/",
            [ProducesResponseType<JournalEntryDto>(201)]
            async (CreateJournalRequest req, LifeOsDbContext db) =>
            {
                var entry = new JournalEntry
                {
                    DomainId  = req.DomainId,
                    EntryDate = req.EntryDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    Content   = req.Content,
                    Mood      = req.Mood,
                    Tags      = req.Tags ?? [],
                    Source    = req.Source,
                    CreatedAt = DateTime.UtcNow,
                };
                db.JournalEntries.Add(entry);
                await db.SaveChangesAsync();
                return Results.Created($"/api/journal/{entry.Id}", ToDto(entry));
            })
            .WithName("CreateJournalEntry");

        /// <summary>
        /// Restituisce il trend del mood degli ultimi 30 giorni.
        /// </summary>
        group.MapGet("/mood-trend",
            [ProducesResponseType<List<MoodTrendDto>>(200)]
            async (LifeOsDbContext db, int days = 30) =>
            {
                var since = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-days));
                var entries = await db.JournalEntries
                    .Where(j => j.EntryDate >= since && j.Mood != null)
                    .OrderBy(j => j.EntryDate)
                    .Select(j => new { j.EntryDate, j.Mood })
                    .ToListAsync();

                var moodScore = new Dictionary<string, int>
                {
                    ["terrible"] = 1, ["bad"] = 2, ["neutral"] = 3,
                    ["good"] = 4, ["great"] = 5, ["peak"] = 6,
                };
                return Results.Ok(entries.Select(e => new MoodTrendDto(
                    e.EntryDate, e.Mood, e.Mood is not null && moodScore.TryGetValue(e.Mood, out var s) ? s : 0
                )).ToList());
            })
            .WithName("GetMoodTrend");
    }

    private static JournalEntryDto ToDto(JournalEntry e) =>
        new(e.Id, e.DomainId, e.EntryDate, e.Content, e.Mood, e.Tags, e.Source, e.CreatedAt);
}
