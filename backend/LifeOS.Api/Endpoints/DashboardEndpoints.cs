using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LifeOS.Api.Data;
using LifeOS.Api.DTOs;
using LifeOS.Api.Services;

namespace LifeOS.Api.Endpoints;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/dashboard").WithTags("Dashboard");

        /// <summary>
        /// Restituisce una panoramica aggregata di tutti i domini del LifeOS.
        /// </summary>
        group.MapGet("/overview",
            [ProducesResponseType<DashboardOverviewDto>(200)]
            async (LifeOsDbContext db) =>
            {
                var profile = await db.BrandProfiles.FirstOrDefaultAsync();
                var finance = await db.Finances.FirstOrDefaultAsync();
                var today   = DateOnly.FromDateTime(DateTime.UtcNow);
                var thisMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

                var activeGoals    = await db.Goals.CountAsync(g => g.Status == "in_progress");
                var completedGoals = await db.Goals.CountAsync(g => g.Status == "completed");
                var currentJob     = await db.Jobs.Where(j => j.IsCurrent).Select(j => j.Role + " @ " + j.Company).FirstOrDefaultAsync();

                var totalHabits    = await db.Habits.CountAsync(h => h.Active);
                var completedToday = await db.HabitLogs.CountAsync(l => l.LoggedDate == today && l.Completed);
                var longestStreak  = await db.Habits.MaxAsync(h => (int?)h.StreakBest) ?? 0;

                var ideasCount = await db.ContentQueue.CountAsync(c => c.Status == "idea");
                var readyCount = await db.ContentQueue.CountAsync(c => c.Status == "ready");
                var publishedThisMonth = await db.ContentQueue.CountAsync(c => c.Status == "published" && c.PublishedAt >= thisMonth);

                var xpToNext = profile is not null ? XpCalculatorService.XpToNextLevel(profile.GlobalLevel) : 1000;

                return Results.Ok(new DashboardOverviewDto(
                    profile is null ? new BrandSnapshotDto("—", 1, 0, "Aspiring Engineer", "bronze", 1000)
                        : new BrandSnapshotDto(profile.Codename, profile.GlobalLevel, profile.TotalXp, profile.Title, profile.Tier, xpToNext),
                    new HabitsSnapshotDto(totalHabits, completedToday, longestStreak),
                    finance is null ? new FinanceSnapshotDto(null, null, 0, 0)
                        : new FinanceSnapshotDto(finance.CurrentRal, finance.TargetRal, finance.Savings, finance.MonthlyBurn),
                    new CareerSnapshotDto(activeGoals, completedGoals, currentJob),
                    new ContentSnapshotDto(ideasCount, readyCount, publishedThisMonth)
                ));
            })
            .WithName("GetDashboardOverview");
    }
}
