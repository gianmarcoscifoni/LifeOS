using LifeOS.Api.Data;
using LifeOS.Api.Models;

namespace LifeOS.Api.Services;

public class WeeklyReviewService(IServiceScopeFactory scopeFactory, ILogger<WeeklyReviewService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTime.UtcNow;
            var nextSunday = GetNextSunday(now, hour: 20);
            var delay = nextSunday - now;
            logger.LogInformation("WeeklyReview scheduled in {Delay}", delay);

            await Task.Delay(delay, stoppingToken);

            if (!stoppingToken.IsCancellationRequested)
                await GenerateReviewAsync(stoppingToken);
        }
    }

    private async Task GenerateReviewAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var claudeSvc = scope.ServiceProvider.GetRequiredService<ClaudeService>();
        var db = scope.ServiceProvider.GetRequiredService<LifeOsDbContext>();

        try
        {
            logger.LogInformation("Generating weekly review...");
            var review = await claudeSvc.GenerateWeeklyReview();
            db.JournalEntries.Add(new JournalEntry
            {
                EntryDate = DateOnly.FromDateTime(DateTime.UtcNow),
                Content   = review,
                Source    = "claude_review",
                Tags      = ["weekly-review"],
                CreatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Weekly review saved.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate weekly review.");
        }
    }

    private static DateTime GetNextSunday(DateTime from, int hour)
    {
        var daysUntilSunday = ((int)DayOfWeek.Sunday - (int)from.DayOfWeek + 7) % 7;
        if (daysUntilSunday == 0 && from.Hour >= hour) daysUntilSunday = 7;
        return from.Date.AddDays(daysUntilSunday).AddHours(hour);
    }
}
