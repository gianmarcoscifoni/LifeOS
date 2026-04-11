using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LifeOS.Api.Data;
using LifeOS.Api.DTOs;
using LifeOS.Api.Services;

namespace LifeOS.Api.Endpoints;

public static class BrandEndpoints
{
    public static void MapBrandEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/brand").WithTags("Brand RPG");

        /// <summary>
        /// Recupera il profilo brand con statistiche, archetipi e livello corrente.
        /// </summary>
        group.MapGet("/profile",
            [ProducesResponseType<BrandProfileDto>(200)]
            [ProducesResponseType(404)]
            async (LifeOsDbContext db) =>
            {
                var p = await db.BrandProfiles
                    .Include(x => x.Stats)
                    .Include(x => x.Archetypes)
                    .FirstOrDefaultAsync();
                if (p is null) return Results.NotFound();
                return Results.Ok(new BrandProfileDto(
                    p.Id, p.Codename, p.GlobalLevel, p.TotalXp,
                    p.Title, p.Tier, p.OriginStory, p.MissionStatement, p.AvatarUrl,
                    p.Stats.Select(s => new BrandStatDto(s.StatName, s.BaseValue, s.CurrentValue, s.MaxValue)).ToList(),
                    p.Archetypes.Select(a => new BrandArchetypeDto(a.Name, a.Description, a.AffinityPct, a.IsPrimary)).ToList()
                ));
            })
            .WithName("GetBrandProfile");

        /// <summary>
        /// Registra XP guadagnato da un'azione e aggiorna il livello dell'albero.
        /// </summary>
        group.MapPost("/xp",
            [ProducesResponseType<XpResultDto>(200)]
            [ProducesResponseType(400)]
            async (XpLogRequest req, XpCalculatorService xpSvc) =>
            {
                try { return Results.Ok(await xpSvc.LogXp(req)); }
                catch (ArgumentException ex) { return Results.BadRequest(ex.Message); }
            })
            .WithName("LogXp");

        /// <summary>
        /// Restituisce tutti gli alberi di competenze con i nodi.
        /// </summary>
        group.MapGet("/skill-trees",
            [ProducesResponseType<List<SkillTreeDto>>(200)]
            async (LifeOsDbContext db) =>
            {
                var trees = await db.SkillTrees
                    .Include(t => t.Nodes.OrderBy(n => n.SortOrder))
                    .OrderBy(t => t.Name)
                    .ToListAsync();
                return Results.Ok(trees.Select(t => new SkillTreeDto(
                    t.Id, t.Name, t.TreeLevel, t.TreeXp, t.XpToNext, t.Icon,
                    t.Nodes.Select(n => new SkillNodeDto(n.Id, n.Name, n.Description, n.LevelRequired, n.XpReward, n.Unlocked, n.SortOrder)).ToList()
                )).ToList());
            })
            .WithName("GetSkillTrees");

        /// <summary>
        /// Restituisce tutti i traguardi con stato di sblocco.
        /// </summary>
        group.MapGet("/achievements",
            [ProducesResponseType<List<AchievementDto>>(200)]
            async (LifeOsDbContext db) =>
            {
                var list = await db.Achievements.OrderBy(a => a.Unlocked).ThenBy(a => a.Name).ToListAsync();
                return Results.Ok(list.Select(a => new AchievementDto(
                    a.Id, a.Name, a.Description, a.BadgeIcon, a.XpReward, a.Unlocked, a.UnlockedAt, a.UnlockCondition
                )).ToList());
            })
            .WithName("GetAchievements");

        /// <summary>
        /// Sblocca manualmente un traguardo e assegna i punti XP.
        /// </summary>
        group.MapPost("/achievements/{id:guid}/unlock",
            [ProducesResponseType<AchievementDto>(200)]
            [ProducesResponseType(404)]
            async (Guid id, LifeOsDbContext db, XpCalculatorService xpSvc) =>
            {
                var a = await db.Achievements.Include(x => x.Tree).FirstOrDefaultAsync(x => x.Id == id);
                if (a is null) return Results.NotFound();
                if (a.Unlocked) return Results.Ok(new AchievementDto(a.Id, a.Name, a.Description, a.BadgeIcon, a.XpReward, a.Unlocked, a.UnlockedAt, a.UnlockCondition));
                a.Unlocked = true;
                a.UnlockedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
                if (a.Tree is not null)
                    await xpSvc.LogXp(new XpLogRequest($"Achievement: {a.Name}", a.XpReward, a.Tree.Name));
                return Results.Ok(new AchievementDto(a.Id, a.Name, a.Description, a.BadgeIcon, a.XpReward, a.Unlocked, a.UnlockedAt, a.UnlockCondition));
            })
            .WithName("UnlockAchievement");
    }
}
