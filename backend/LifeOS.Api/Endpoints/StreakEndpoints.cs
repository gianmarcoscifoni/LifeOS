using Microsoft.EntityFrameworkCore;
using LifeOS.Api.Data;
using LifeOS.Api.Models;
using LifeOS.Api.Services;

namespace LifeOS.Api.Endpoints;

public static class StreakEndpoints
{
    // ── Milestone table ───────────────────────────────────────────────────

    private record Milestone(int Days, string Name, string Icon, int XpReward, string Color);

    private static readonly Milestone[] Milestones =
    [
        new(1,     "First Spark",      "🌱", 100,     "#34D399"),
        new(3,     "Trilogy",          "✨", 250,     "#60A5FA"),
        new(7,     "Week Warrior",     "🔥", 500,     "#F97316"),
        new(14,    "Fortnight",        "⚡", 750,     "#FBBF24"),
        new(21,    "Habit Formed",     "💪", 1_000,   "#A78BFA"),
        new(30,    "Month Master",     "🏆", 2_000,   "#C9A84C"),
        new(60,    "Diamond Streak",   "💎", 3_500,   "#67E8F9"),
        new(90,    "Quarter Legend",   "👑", 5_000,   "#9333EA"),
        new(180,   "Half Year",        "🌟", 8_000,   "#C084FC"),
        new(365,   "Year One",         "🎯", 15_000,  "#E2E8F0"),
        new(730,   "Two Years",        "🚀", 25_000,  "#F0C96E"),
        new(1_825, "Five Year Arc",    "⚜️", 50_000,  "#FCD34D"),
        new(3_650, "Decade",           "🏛️", 100_000, "#C9A84C"),
        new(9_125, "Quarter Century",  "👁️", 250_000, "#9333EA"),
        new(18_250,"Half Century",     "🌌", 500_000, "#7C3AED"),
        new(36_500,"Century",          "∞",  1_000_000,"#C084FC"),
    ];

    public static void MapStreakEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/streak").WithTags("Streak");

        // ── Check-in (idempotent — safe to call on every page load) ──────
        group.MapPost("/checkin", async (LifeOsDbContext db) =>
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            // Already checked in today — return current state without writing
            if (await db.DailyCheckins.AnyAsync(c => c.Date == today))
                return Results.Ok(await BuildState(db, today, xpToday: 0, milestoneHit: null));

            // Compute streak length
            var sorted    = await db.DailyCheckins.OrderByDescending(c => c.Date).ToListAsync();
            var yesterday = today.AddDays(-1);

            int streakDay;
            if (sorted.Count == 0 || sorted[0].Date < yesterday)
                streakDay = 1;                          // broken or first ever
            else
                streakDay = sorted[0].StreakDay + 1;    // continue streak

            db.DailyCheckins.Add(new DailyCheckin { Date = today, StreakDay = streakDay });

            // XP: 50 base + 10 per day every 7d multiplier
            var baseXp  = 50 + (streakDay / 7) * 10;
            var profile = await db.BrandProfiles.FirstOrDefaultAsync();

            // Milestone hit?
            var hit = Milestones.FirstOrDefault(m => m.Days == streakDay);

            if (profile is not null)
            {
                profile.TotalXp += baseXp + (hit?.XpReward ?? 0);
                // Recalculate level/tier so dashboard reflects the XP immediately
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
            }

            // Record memory for milestones and weekly streaks
            if (hit is not null)
            {
                db.ContextMemories.Add(new Models.ContextMemory
                {
                    Category   = "streak",
                    Fact       = $"Unlocked '{hit.Name}' milestone — {hit.Days}-day streak ({hit.XpReward} XP)",
                    Importance = 5,
                    CreatedAt  = DateTime.UtcNow,
                });
            }
            else if (streakDay % 7 == 0)
            {
                db.ContextMemories.Add(new Models.ContextMemory
                {
                    Category   = "streak",
                    Fact       = $"Reached {streakDay}-day streak",
                    Importance = 3,
                    CreatedAt  = DateTime.UtcNow,
                });
            }

            await db.SaveChangesAsync();
            return Results.Ok(await BuildState(db, today, baseXp + (hit?.XpReward ?? 0), hit is null ? null : new {
                hit.Days, hit.Name, hit.Icon, hit.XpReward, hit.Color,
            }));
        }).WithName("DailyCheckin");

        // ── Get current streak state ───────────────────────────────────────
        group.MapGet("/", async (LifeOsDbContext db) =>
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            return Results.Ok(await BuildState(db, today, 0, null));
        }).WithName("GetStreak");
    }

    // ── State builder ─────────────────────────────────────────────────────

    private static async Task<object> BuildState(
        LifeOsDbContext db, DateOnly today, int xpToday, object? milestoneHit)
    {
        var all  = await db.DailyCheckins.OrderByDescending(c => c.Date).ToListAsync();
        var todayChecked = all.Any(c => c.Date == today);

        // Current streak
        int current = 0;
        if (all.Count > 0)
        {
            var cursor = todayChecked ? today : today.AddDays(-1);
            foreach (var c in all.OrderByDescending(c => c.Date))
            {
                if (c.Date == cursor) { current++; cursor = cursor.AddDays(-1); }
                else break;
            }
        }

        var longest    = all.Count > 0 ? all.Max(c => c.StreakDay) : 0;
        var totalDays  = all.Count;

        // Next milestone
        var next = Milestones.FirstOrDefault(m => m.Days > current);

        // Achieved milestones
        var achieved = Milestones.Where(m => m.Days <= current).ToList();

        // Heatmap: last 365 days as bool array (index 0 = oldest)
        var start365 = today.AddDays(-364);
        var dateSet  = all.Select(c => c.Date).ToHashSet();
        var heatmap  = Enumerable.Range(0, 365)
            .Select(i => dateSet.Contains(start365.AddDays(i)))
            .ToArray();

        return new
        {
            current_streak   = current,
            longest_streak   = longest,
            total_days       = totalDays,
            today_checked_in = todayChecked,
            xp_awarded_today = xpToday,
            milestone_hit    = milestoneHit,
            next_milestone   = next is null ? null : new
            {
                next.Days, next.Name, next.Icon, next.XpReward, next.Color,
                days_away = next.Days - current,
            },
            milestones_achieved = achieved.Select(m => new { m.Days, m.Name, m.Icon, m.Color }),
            milestones_all      = Milestones.Select(m => new
            {
                m.Days, m.Name, m.Icon, m.Color, m.XpReward,
                achieved = m.Days <= current,
            }),
            heatmap,
        };
    }
}
