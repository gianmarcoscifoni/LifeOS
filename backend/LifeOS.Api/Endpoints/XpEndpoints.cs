using Microsoft.EntityFrameworkCore;
using LifeOS.Api.Data;
using LifeOS.Api.Models;
using LifeOS.Api.Services;

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
            return Results.Ok(new { xpEarned = earned, newTotalXp = profile.TotalXp, globalLevel = profile.GlobalLevel, tier = profile.Tier });
        }).WithName("QuickLogXp");
    }
}

public record QuickXpRequest(string Action, string Domain, int XpBase, bool IsTaskDone = false);
