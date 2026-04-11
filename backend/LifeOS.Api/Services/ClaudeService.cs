using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using LifeOS.Api.Data;

namespace LifeOS.Api.Services;

public class ClaudeService(HttpClient http, LifeOsDbContext db, IConfiguration config)
{
    private const string ApiUrl = "https://api.anthropic.com/v1/messages";
    private const string Model   = "claude-sonnet-4-20250514";

    public async Task<string> Ask(string question)
    {
        var context = await BuildContext();
        var body = BuildRequestBody(question, context, stream: false);
        var response = await SendRequest(body);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString() ?? string.Empty;
    }

    public async IAsyncEnumerable<string> AskStream(string question)
    {
        var context = await BuildContext();
        var body = BuildRequestBody(question, context, stream: true);
        var response = await SendRequest(body);

        using var stream = await response.Content.ReadAsStreamAsync();
        using var reader = new StreamReader(stream);

        string? line;
        while ((line = await reader.ReadLineAsync()) != null)
        {
            if (string.IsNullOrWhiteSpace(line) || !line.StartsWith("data: ")) continue;
            var data = line["data: ".Length..];
            if (data == "[DONE]") yield break;
            using var doc = JsonDocument.Parse(data);
            var type = doc.RootElement.GetProperty("type").GetString();
            if (type != "content_block_delta") continue;
            var delta = doc.RootElement.GetProperty("delta");
            if (delta.GetProperty("type").GetString() != "text_delta") continue;
            yield return delta.GetProperty("text").GetString() ?? string.Empty;
        }
    }

    public async Task<string> GenerateWeeklyReview()
    {
        var summary = await BuildWeeklySummary();
        return await Ask($"Genera la mia review settimanale basata su questi dati: {summary}");
    }

    private static object BuildRequestBody(string question, string context, bool stream) => new
    {
        model = Model,
        max_tokens = 2000,
        stream,
        system = $"""
            Sei il consigliere AI di Gianmarco, ingegnere con il progetto Digital Aura.
            Rispondi in italiano con ironia romana — diretto, concreto, un filo caustico.
            Ecco il contesto completo del suo LifeOS:
            {context}
            """,
        messages = new[] { new { role = "user", content = question } },
    };

    private async Task<HttpResponseMessage> SendRequest(object body)
    {
        var apiKey = config["AnthropicApiKey"]
            ?? throw new InvalidOperationException("AnthropicApiKey not configured.");

        var json = JsonSerializer.Serialize(body, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });
        var request = new HttpRequestMessage(HttpMethod.Post, ApiUrl)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };
        request.Headers.Add("x-api-key", apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");

        var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
        response.EnsureSuccessStatusCode();
        return response;
    }

    private async Task<string> BuildContext()
    {
        var profile = await db.BrandProfiles
            .Include(p => p.Stats)
            .Include(p => p.SkillTrees)
            .FirstOrDefaultAsync();

        var activeGoals = await db.Goals
            .Where(g => g.Status == "in_progress")
            .Take(10)
            .ToListAsync();

        var habits = await db.Habits
            .Where(h => h.Active)
            .Select(h => new { h.Name, h.StreakCurrent, h.Frequency })
            .ToListAsync();

        var finance = await db.Finances.FirstOrDefaultAsync();

        var recentJournal = await db.JournalEntries
            .OrderByDescending(j => j.CreatedAt)
            .Take(3)
            .Select(j => new { j.EntryDate, j.Mood, j.Content })
            .ToListAsync();

        var contentReady = await db.ContentQueue
            .Where(c => c.Status == "ready" || c.Status == "idea")
            .CountAsync();

        return JsonSerializer.Serialize(new
        {
            brand = profile == null ? null : new
            {
                profile.Codename,
                profile.GlobalLevel,
                profile.TotalXp,
                profile.Tier,
                profile.Title,
                stats = profile.Stats.Select(s => new { s.StatName, s.CurrentValue }),
                trees = profile.SkillTrees.Select(t => new { t.Name, t.TreeLevel, t.TreeXp }),
            },
            activeGoals = activeGoals.Select(g => new { g.Title, g.Status, g.ProgressPct }),
            habits = habits,
            finance = finance == null ? null : new
            {
                finance.CurrentRal,
                finance.TargetRal,
                finance.Savings,
                finance.MonthlyBurn,
            },
            recentJournal,
            contentReady,
        }, new JsonSerializerOptions { WriteIndented = false });
    }

    private async Task<string> BuildWeeklySummary()
    {
        var since = DateTime.UtcNow.AddDays(-7);

        var completedHabits = await db.HabitLogs
            .Where(l => l.LoggedDate >= DateOnly.FromDateTime(since) && l.Completed)
            .CountAsync();

        var xpEarned = await db.XpLogs
            .Where(x => x.EarnedAt >= since)
            .SumAsync(x => x.XpEarned);

        var published = await db.ContentQueue
            .Where(c => c.PublishedAt >= since)
            .CountAsync();

        var moods = await db.JournalEntries
            .Where(j => j.CreatedAt >= since)
            .Select(j => j.Mood)
            .ToListAsync();

        return JsonSerializer.Serialize(new { completedHabits, xpEarned, published, moods });
    }
}
