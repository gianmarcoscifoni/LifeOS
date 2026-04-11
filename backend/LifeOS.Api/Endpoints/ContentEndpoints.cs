using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LifeOS.Api.Data;
using LifeOS.Api.DTOs;
using LifeOS.Api.Models;
using LifeOS.Api.Services;

namespace LifeOS.Api.Endpoints;

public static class ContentEndpoints
{
    public static void MapContentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/content").WithTags("Content");

        /// <summary>
        /// Restituisce la coda contenuti, con filtro opzionale per stato.
        /// </summary>
        group.MapGet("/queue",
            [ProducesResponseType<List<ContentQueueDto>>(200)]
            async (LifeOsDbContext db, string? status) =>
            {
                var q = db.ContentQueue
                    .Include(c => c.Platform)
                    .Include(c => c.Pillar)
                    .Include(c => c.Tree)
                    .AsQueryable();
                if (status is not null) q = q.Where(c => c.Status == status);
                var list = await q.OrderByDescending(c => c.CreatedAt).ToListAsync();
                return Results.Ok(list.Select(ToDto).ToList());
            })
            .WithName("GetContentQueue");

        /// <summary>
        /// Aggiunge un nuovo elemento alla coda contenuti.
        /// </summary>
        group.MapPost("/queue",
            [ProducesResponseType<ContentQueueDto>(201)]
            async (CreateContentRequest req, LifeOsDbContext db) =>
            {
                var item = new ContentQueue
                {
                    PlatformId   = req.PlatformId,
                    Title        = req.Title,
                    Draft        = req.Draft,
                    PillarId     = req.PillarId,
                    TreeId       = req.TreeId,
                    Format       = req.Format,
                    ScheduledFor = req.ScheduledFor,
                    Status       = "idea",
                    CreatedAt    = DateTime.UtcNow,
                    UpdatedAt    = DateTime.UtcNow,
                };
                db.ContentQueue.Add(item);
                await db.SaveChangesAsync();
                await db.Entry(item).Reference(c => c.Platform).LoadAsync();
                return Results.Created($"/api/content/queue/{item.Id}", ToDto(item));
            })
            .WithName("CreateContent");

        /// <summary>
        /// Aggiorna stato o dati di un elemento della coda (usato dal kanban drag-and-drop).
        /// </summary>
        group.MapPatch("/queue/{id:guid}",
            [ProducesResponseType<ContentQueueDto>(200)]
            [ProducesResponseType(404)]
            async (Guid id, UpdateContentRequest req, LifeOsDbContext db) =>
            {
                var item = await db.ContentQueue
                    .Include(c => c.Platform)
                    .Include(c => c.Pillar)
                    .Include(c => c.Tree)
                    .FirstOrDefaultAsync(c => c.Id == id);
                if (item is null) return Results.NotFound();
                if (req.Title is not null) item.Title = req.Title;
                if (req.Draft is not null) item.Draft = req.Draft;
                if (req.Status is not null) item.Status = req.Status;
                if (req.PillarId is not null) item.PillarId = req.PillarId;
                if (req.TreeId is not null) item.TreeId = req.TreeId;
                if (req.Format is not null) item.Format = req.Format;
                if (req.ScheduledFor is not null) item.ScheduledFor = req.ScheduledFor;
                item.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
                return Results.Ok(ToDto(item));
            })
            .WithName("UpdateContent");

        /// <summary>
        /// Pubblica un contenuto e assegna i punti XP relativi.
        /// </summary>
        group.MapPost("/queue/{id:guid}/publish",
            [ProducesResponseType<ContentQueueDto>(200)]
            [ProducesResponseType(404)]
            async (Guid id, LifeOsDbContext db, XpCalculatorService xpSvc) =>
            {
                var item = await db.ContentQueue
                    .Include(c => c.Platform)
                    .Include(c => c.Pillar)
                    .Include(c => c.Tree)
                    .FirstOrDefaultAsync(c => c.Id == id);
                if (item is null) return Results.NotFound();
                item.Status      = "published";
                item.PublishedAt = DateTime.UtcNow;
                item.UpdatedAt   = DateTime.UtcNow;
                await db.SaveChangesAsync();
                if (item.Tree is not null)
                    await xpSvc.LogXp(new XpLogRequest($"Publish {item.Format ?? "post"}", item.XpOnPublish, item.Tree.Name, PlatformId: item.PlatformId));
                return Results.Ok(ToDto(item));
            })
            .WithName("PublishContent");

        /// <summary>
        /// Restituisce tutti i pilastri editoriali del brand.
        /// </summary>
        group.MapGet("/pillars",
            [ProducesResponseType<List<BrandPillarDto>>(200)]
            async (LifeOsDbContext db) =>
            {
                var list = await db.BrandPillars.Where(p => p.Status == "active").OrderByDescending(p => p.WeightPct).ToListAsync();
                return Results.Ok(list.Select(p => new BrandPillarDto(p.Id, p.Name, p.Thesis, p.WeightPct, p.Status)).ToList());
            })
            .WithName("GetPillars");
    }

    private static ContentQueueDto ToDto(ContentQueue c) => new(
        c.Id, c.PlatformId, c.Platform?.Name ?? string.Empty,
        c.PillarId, c.Pillar?.Name, c.TreeId, c.Tree?.Name,
        c.Title, c.Draft, c.Status, c.ScheduledFor, c.PublishedAt,
        c.Format, c.XpOnPublish, c.CreatedAt
    );
}
