using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LifeOS.Api.Data;
using LifeOS.Api.DTOs;
using LifeOS.Api.Models;
using LifeOS.Api.Services;

namespace LifeOS.Api.Endpoints;

public static class HabitEndpoints
{
    public static void MapHabitEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/habits").WithTags("Habits");

        /// <summary>
        /// Restituisce tutti le abitudini attive.
        /// </summary>
        group.MapGet("/",
            [ProducesResponseType<List<HabitDto>>(200)]
            async (LifeOsDbContext db) =>
            {
                var list = await db.Habits.Where(h => h.Active).OrderBy(h => h.Name).ToListAsync();
                return Results.Ok(list.Select(ToDto).ToList());
            })
            .WithName("GetHabits");

        /// <summary>
        /// Crea una nuova abitudine.
        /// </summary>
        group.MapPost("/",
            [ProducesResponseType<HabitDto>(201)]
            async (CreateHabitRequest req, LifeOsDbContext db) =>
            {
                var domainId = req.DomainId
                    ?? (await db.LifeDomains.OrderBy(d => d.Name).Select(d => d.Id).FirstOrDefaultAsync());
                if (domainId == Guid.Empty)
                    return Results.BadRequest("No life domains found — seed the database.");
                var h = new Habit
                {
                    DomainId  = domainId,
                    GoalId    = req.GoalId,
                    Name      = req.Name,
                    Frequency = req.Frequency,
                    Active    = true,
                    CreatedAt = DateTime.UtcNow,
                };
                db.Habits.Add(h);
                await db.SaveChangesAsync();
                return Results.Created($"/api/habits/{h.Id}", ToDto(h));
            })
            .WithName("CreateHabit");

        /// <summary>
        /// Registra il completamento giornaliero di un'abitudine.
        /// </summary>
        group.MapPost("/{id:guid}/log",
            [ProducesResponseType<HabitLogDto>(200)]
            [ProducesResponseType(404)]
            async (Guid id, LogHabitRequest req, LifeOsDbContext db) =>
            {
                var habit = await db.Habits.FindAsync(id);
                if (habit is null) return Results.NotFound();

                var date = req.LoggedDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
                var existing = await db.HabitLogs.FirstOrDefaultAsync(l => l.HabitId == id && l.LoggedDate == date);
                if (existing is not null)
                {
                    existing.Completed = req.Completed;
                    existing.Notes     = req.Notes;
                }
                else
                {
                    existing = new HabitLog { HabitId = id, LoggedDate = date, Completed = req.Completed, Notes = req.Notes };
                    db.HabitLogs.Add(existing);
                }

                if (req.Completed)
                {
                    await RecalculateStreak(habit, db);
                    // Award 25 XP per completed habit and update level
                    var profile = await db.BrandProfiles.FirstOrDefaultAsync();
                    if (profile is not null)
                    {
                        profile.TotalXp += 25;
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
                }

                await db.SaveChangesAsync();
                return Results.Ok(new HabitLogDto(existing.Id, existing.HabitId, existing.LoggedDate, existing.Completed, existing.Notes));
            })
            .WithName("LogHabit");

        /// Returns all habit logs from the last N days (default 90) for all habits.
        group.MapGet("/logs/recent", async (LifeOsDbContext db, int? days) =>
        {
            var since = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-(days ?? 90));
            var logs  = await db.HabitLogs
                .Where(l => l.LoggedDate >= since)
                .Select(l => new { l.HabitId, l.LoggedDate, l.Completed })
                .OrderByDescending(l => l.LoggedDate)
                .ToListAsync();
            return Results.Ok(logs);
        }).WithName("GetRecentHabitLogs");

        /// Returns available life domains (used when creating a new habit).
        group.MapGet("/domains", async (LifeOsDbContext db) =>
        {
            var domains = await db.LifeDomains
                .Select(d => new { d.Id, d.Name })
                .OrderBy(d => d.Name)
                .ToListAsync();
            return Results.Ok(domains);
        }).WithName("GetHabitDomains");

        /// <summary>
        /// Restituisce la streak corrente e migliore di un'abitudine.
        /// </summary>
        group.MapGet("/{id:guid}/streak",
            [ProducesResponseType<HabitStreakDto>(200)]
            [ProducesResponseType(404)]
            async (Guid id, LifeOsDbContext db) =>
            {
                var h = await db.Habits.FindAsync(id);
                if (h is null) return Results.NotFound();
                return Results.Ok(new HabitStreakDto(h.Id, h.StreakCurrent, h.StreakBest));
            })
            .WithName("GetHabitStreak");

        /// <summary>
        /// Restituisce le abitudini di oggi con stato di completamento.
        /// </summary>
        group.MapGet("/today",
            [ProducesResponseType<TodayHabitsDto>(200)]
            async (LifeOsDbContext db) =>
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var habits = await db.Habits.Where(h => h.Active).ToListAsync();
                var logs = await db.HabitLogs.Where(l => l.LoggedDate == today).ToListAsync();
                var completed = logs.Count(l => l.Completed);
                return Results.Ok(new TodayHabitsDto(
                    habits.Select(ToDto).ToList(),
                    logs.Select(l => new HabitLogDto(l.Id, l.HabitId, l.LoggedDate, l.Completed, l.Notes)).ToList(),
                    completed,
                    habits.Count
                ));
            })
            .WithName("GetTodayHabits");
    }

    private static HabitDto ToDto(Habit h) =>
        new(h.Id, h.DomainId, h.GoalId, h.Name, h.Frequency, h.StreakCurrent, h.StreakBest, h.Active);

    private static async Task RecalculateStreak(Habit habit, LifeOsDbContext db)
    {
        var logs = await db.HabitLogs
            .Where(l => l.HabitId == habit.Id && l.Completed)
            .OrderByDescending(l => l.LoggedDate)
            .Select(l => l.LoggedDate)
            .ToListAsync();

        var streak = 0;
        var expected = DateOnly.FromDateTime(DateTime.UtcNow);
        foreach (var date in logs)
        {
            if (date == expected) { streak++; expected = expected.AddDays(-1); }
            else break;
        }
        habit.StreakCurrent = streak;
        if (streak > habit.StreakBest) habit.StreakBest = streak;
    }
}
