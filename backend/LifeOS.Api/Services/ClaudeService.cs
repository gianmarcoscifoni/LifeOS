using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using LifeOS.Api.Data;
using LifeOS.Api.DTOs;
using LifeOS.Api.Models;

namespace LifeOS.Api.Services;

public class ClaudeService(
    HttpClient http,
    LifeOsDbContext db,
    IConfiguration config,
    XpCalculatorService xp)
{
    private const string ApiUrl = "https://api.anthropic.com/v1/messages";
    private const string Model   = "claude-sonnet-4-6";

    public async Task<string> Ask(string question, List<MessageDto>? history = null)
    {
        var context = await BuildContext();
        var body = BuildRequestBody(question, context, stream: false, history);
        var response = await SendRequest(body);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString() ?? string.Empty;
    }

    public async IAsyncEnumerable<string> AskStream(string question, List<MessageDto>? history = null)
    {
        var context = await BuildContext();
        var body = BuildRequestBody(question, context, stream: true, history);
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
        var review = await Ask($"Genera la mia review settimanale basata su questi dati: {summary}");

        // Persist as journal entry
        db.JournalEntries.Add(new JournalEntry
        {
            Id        = Guid.NewGuid(),
            EntryDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Content   = review,
            Mood      = "neutral",
            Tags      = ["weekly_review", "ai_generated"],
            Source    = "weekly_review",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        return review;
    }

    public async Task<TranscriptAnalysisDto> AnalyzeTranscript(string transcript)
    {
        var body = new
        {
            model = Model,
            max_tokens = 1200,
            stream = false,
            system = "Sei un analizzatore di testo. Rispondi SOLO con JSON valido, nessun testo extra, nessun markdown.",
            messages = new[]
            {
                new
                {
                    role = "user",
                    content = $$"""
                        Analizza questa trascrizione vocale. Rispondi SOLO con questo JSON (nessun testo aggiuntivo, nessun markdown):
                        {
                          "keywords": ["parola1", "parola2"],
                          "topics": [{"text":"...","area":"career|habits|finance|health|brand","icon":"emoji","confidence":0.9}],
                          "goals": [{"title":"...","area":"career","priority":"high|medium|low","due_hint":"questa settimana|questo mese|null"}],
                          "mood": "great|good|neutral|low|terrible",
                          "gratitude": ["cosa1"],
                          "coaching_message": "Una frase motivazionale in italiano, max 2 frasi.",
                          "expenses": [{"description":"caffè","amount":3.50,"category":"food|transport|entertainment|health|other"}],
                          "content_ideas": [{"title":"...","platform":"LinkedIn|Instagram|YouTube|GitHub","format":"post|article|reel|carousel|video"}],
                          "habit_mentions": [{"name":"palestra","completed":true}],
                          "xp_rewards": [{"action":"Publish LinkedIn post","xp":50,"icon":"💼","area":"brand"}]
                        }
                        Regole per xp_rewards — usa SOLO queste azioni con questi XP esatti:
                        "Publish LinkedIn post"=50, "Publish LinkedIn article"=150, "Publish Medium article"=200,
                        "Instagram carousel"=75, "Instagram reel"=100, "GitHub open source commit"=30,
                        "Conference talk"=500, "Land a client"=1000, "Certification earned"=750,
                        "Networking event attended"=100, "1-on-1 coffee with contact"=50, "30-day habit streak"=200.
                        Trascrizione: {{transcript}}
                        """,
                },
            },
        };

        var response = await SendRequest(body);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var raw = doc.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString() ?? "{}";

        var cleaned = raw.Trim();
        if (cleaned.StartsWith("```"))
        {
            cleaned = cleaned[(cleaned.IndexOf('\n') + 1)..];
            cleaned = cleaned[..cleaned.LastIndexOf("```")].Trim();
        }

        var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        return JsonSerializer.Deserialize<TranscriptAnalysisDto>(cleaned, opts)
            ?? throw new InvalidOperationException("Failed to parse transcript analysis response.");
    }

    public async Task<CommitResultDto> CommitTranscript(CommitTranscriptRequest req)
    {
        var totalXp = 0;
        var leveledUp = false;
        var newLevel = 0;
        var newTier = string.Empty;
        var newTitle = string.Empty;
        var goalsCreated = new List<CreatedGoalDto>();
        var habitsLogged = new List<LoggedHabitDto>();
        var contentCreated = 0;

        // --- 1. Resolve domains ---
        var domains = await db.LifeDomains.ToListAsync();
        Guid GetDomainId(string area)
        {
            var match = domains.FirstOrDefault(d =>
                d.Name.ToLower().Contains(area.ToLower()) ||
                area.ToLower().Contains(d.Name.ToLower()));
            return match?.Id ?? domains.FirstOrDefault()?.Id
                ?? throw new InvalidOperationException("No life domains found.");
        }

        // --- 2. Create goals ---
        foreach (var title in req.GoalTitles)
        {
            var area = "career"; // default; frontend can pass area per goal in future
            var goal = new Goal
            {
                Id         = Guid.NewGuid(),
                DomainId   = GetDomainId(area),
                Title      = title,
                Status     = "not_started",
                CreatedAt  = DateTime.UtcNow,
                UpdatedAt  = DateTime.UtcNow,
            };
            db.Goals.Add(goal);
            goalsCreated.Add(new CreatedGoalDto(goal.Id, title, area));
        }

        // --- 3. Journal entry ---
        var journalSaved = false;
        if (req.CreateJournalEntry && !string.IsNullOrWhiteSpace(req.Transcript))
        {
            db.JournalEntries.Add(new JournalEntry
            {
                Id        = Guid.NewGuid(),
                EntryDate = DateOnly.FromDateTime(DateTime.UtcNow),
                Content   = req.Transcript,
                Mood      = req.Mood,
                Tags      = ["voice_checkin"],
                Source    = "voice",
                CreatedAt = DateTime.UtcNow,
            });
            journalSaved = true;
        }

        // --- 4. Log habits (fuzzy match) ---
        var allHabits = await db.Habits.Where(h => h.Active).ToListAsync();
        foreach (var mention in req.HabitMentions)
        {
            var habit = allHabits.FirstOrDefault(h =>
                h.Name.ToLower().Contains(mention.Name.ToLower()) ||
                mention.Name.ToLower().Contains(h.Name.ToLower()));

            if (habit == null)
            {
                habitsLogged.Add(new LoggedHabitDto(mention.Name, false, false));
                continue;
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var existing = await db.HabitLogs
                .FirstOrDefaultAsync(l => l.HabitId == habit.Id && l.LoggedDate == today);

            if (existing == null)
            {
                db.HabitLogs.Add(new HabitLog
                {
                    Id          = Guid.NewGuid(),
                    HabitId     = habit.Id,
                    LoggedDate  = today,
                    Completed   = mention.Completed,
                });
            }
            habitsLogged.Add(new LoggedHabitDto(mention.Name, true, true));
        }

        // --- 5. Create content ideas ---
        var platforms = await db.Platforms.ToListAsync();
        foreach (var idea in req.ContentIdeas)
        {
            var platform = platforms.FirstOrDefault(p =>
                p.Name.ToLower().Contains(idea.Platform.ToLower()) ||
                idea.Platform.ToLower().Contains(p.Name.ToLower()));
            if (platform == null) continue;

            db.ContentQueue.Add(new ContentQueue
            {
                Id          = Guid.NewGuid(),
                PlatformId  = platform.Id,
                Title       = idea.Title,
                Format      = idea.Format,
                Status      = "idea",
                XpOnPublish = 50,
                CreatedAt   = DateTime.UtcNow,
                UpdatedAt   = DateTime.UtcNow,
            });
            contentCreated++;
        }

        await db.SaveChangesAsync();

        // --- 6. Grant XP rewards (after SaveChanges) ---
        var rewardsGranted = new List<XpRewardDto>();
        foreach (var reward in req.XpRewards)
        {
            try
            {
                var result = await xp.LogXp(new XpLogRequest(reward.Action, reward.Xp, reward.Area));
                totalXp += reward.Xp;
                if (result.LeveledUp)
                {
                    leveledUp = true;
                    newLevel  = result.GlobalLevel;
                    newTier   = result.Tier;
                    newTitle  = result.Title;
                }
                rewardsGranted.Add(reward);
            }
            catch
            {
                // Tree not found for this action — skip gracefully
            }
        }

        // Always award check-in XP
        try
        {
            var checkin = await xp.LogXp(new XpLogRequest("Weekly review completed", 25, "Content Creation"));
            totalXp += 25;
            if (checkin.LeveledUp)
            {
                leveledUp = true;
                newLevel  = checkin.GlobalLevel;
                newTier   = checkin.Tier;
                newTitle  = checkin.Title;
            }
            rewardsGranted.Add(new XpRewardDto("Voice Check-in", 25, "🎙️", "brand"));
        }
        catch { /* no Content Creation tree */ }

        return new CommitResultDto(
            totalXp,
            leveledUp,
            newLevel,
            newTier,
            newTitle,
            [.. goalsCreated],
            [.. habitsLogged],
            journalSaved,
            contentCreated,
            [.. rewardsGranted]);
    }

    private object BuildRequestBody(string question, string context, bool stream, List<MessageDto>? history = null)
    {
        var messages = new List<object>();
        if (history != null)
            foreach (var m in history)
                messages.Add(new { role = m.Role, content = m.Content });
        messages.Add(new { role = "user", content = question });

        return new
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
            messages,
        };
    }

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
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Claude API {(int)response.StatusCode}: {err}");
        }
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
            habits,
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
