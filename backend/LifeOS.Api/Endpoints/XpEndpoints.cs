using Microsoft.EntityFrameworkCore;
using LifeOS.Api.Data;
using LifeOS.Api.Models;
using LifeOS.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LifeOS.Api.Endpoints;

public static class XpEndpoints
{
    public static void MapXpEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/xp").WithTags("XP");

        // Quick XP log — called by frontend XpFloater after animation
        group.MapPost("/quick-log", async (QuickXpRequest req, LifeOsDbContext db) =>
        {
            var profile = await db.BrandProfiles.FirstOrDefaultAsync();
            if (profile is null) return Results.BadRequest("No brand profile.");

            var baseXp  = Math.Max(1, req.XpBase);
            var earned  = req.IsTaskDone ? baseXp * 2 : baseXp;

            // Find the closest skill tree by domain name (fuzzy match)
            var tree = await db.SkillTrees
                .FirstOrDefaultAsync(t => EF.Functions.Like(t.Name.ToLower(), $"%{req.Domain.ToLower()}%"))
                ?? await db.SkillTrees.FirstOrDefaultAsync();

            if (tree is not null)
            {
                db.XpLogs.Add(new XpLog
                {
                    TreeId   = tree.Id,
                    XpEarned = earned,
                    Action   = req.Action,
                    EarnedAt = DateTime.UtcNow,
                });
                tree.TreeXp += earned;
                while (tree.TreeXp >= tree.XpToNext)
                {
                    tree.TreeXp  -= tree.XpToNext;
                    tree.TreeLevel++;
                    tree.XpToNext = XpCalculatorService.XpToNextLevel(tree.TreeLevel);
                }
            }

            profile.TotalXp += earned;
            int acc = 0, lvl = 1;
            while (acc + XpCalculatorService.XpToNextLevel(lvl) <= profile.TotalXp)
            {
                acc += XpCalculatorService.XpToNextLevel(lvl);
                lvl++;
            }
            profile.GlobalLevel = lvl;
            profile.Tier        = XpCalculatorService.TierForLevel(lvl);
            profile.Title       = XpCalculatorService.TitleForTier(profile.Tier);
            profile.UpdatedAt   = DateTime.UtcNow;

            await db.SaveChangesAsync();

            // Record memory fact if task was done (important milestone worth remembering)
            if (req.IsTaskDone)
            {
                db.ContextMemories.Add(new ContextMemory
                {
                    Category  = req.Domain,
                    Fact      = $"Completed task '{req.Action}' (+{earned} XP, ×2 bonus)",
                    Importance = 4,
                    CreatedAt  = DateTime.UtcNow,
                });
                await db.SaveChangesAsync();
            }

            return Results.Ok(new { xpEarned = earned, newTotalXp = profile.TotalXp, globalLevel = profile.GlobalLevel, tier = profile.Tier });
        }).WithName("QuickLogXp");

        // Add a raw memory fact to the context DB
        group.MapPost("/memory", async (MemoryRequest req, LifeOsDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(req.Fact)) return Results.BadRequest("Fact cannot be empty.");
            db.ContextMemories.Add(new ContextMemory
            {
                Category  = req.Category,
                Fact      = req.Fact.Trim(),
                Importance = Math.Clamp(req.Importance, 1, 5),
                CreatedAt  = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        }).WithName("AddMemory");

        // Get recent memory facts (for display in UI)
        group.MapGet("/memory", async (LifeOsDbContext db, int? limit) =>
        {
            var facts = await db.ContextMemories
                .OrderByDescending(m => m.CreatedAt)
                .Take(limit ?? 50)
                .Select(m => new { m.Id, m.Category, m.Fact, m.Importance, m.CreatedAt })
                .ToListAsync();
            return Results.Ok(facts);
        }).WithName("GetMemory");
    }
}

public record QuickXpRequest(string Action, string Domain, int XpBase, bool IsTaskDone = false);
public record MemoryRequest(string Category, string Fact, int Importance = 3);
