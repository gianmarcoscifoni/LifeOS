using Microsoft.EntityFrameworkCore;
using LifeOS.Api.Data;
using LifeOS.Api.DTOs;
using LifeOS.Api.Models;

namespace LifeOS.Api.Services;

public class XpCalculatorService(LifeOsDbContext db)
{
    private static readonly Dictionary<string, (int Xp, string TreeName)> XpActions = new()
    {
        ["Publish LinkedIn post"]       = (50,   "Content Creation"),
        ["Publish LinkedIn article"]    = (150,  "Thought Leadership"),
        ["Publish Medium article"]      = (200,  "Thought Leadership"),
        ["Instagram carousel"]          = (75,   "Visual Identity"),
        ["Instagram reel"]              = (100,  "Visual Identity"),
        ["GitHub open source commit"]   = (30,   "Technical Authority"),
        ["Conference talk"]             = (500,  "Thought Leadership"),
        ["Land a client"]               = (1000, "Entrepreneurship"),
        ["Certification earned"]        = (750,  "Technical Authority"),
        ["Networking event attended"]   = (100,  "Networking"),
        ["1-on-1 coffee with contact"]  = (50,   "Networking"),
        ["Weekly review completed"]     = (25,   "Content Creation"),  // distributed to all trees
        ["30-day habit streak"]         = (200,  "Content Creation"),
    };

    public static int XpToNextLevel(int level) =>
        (int)Math.Floor(1000 * Math.Pow(1.15, level - 1));

    public static string TierForLevel(int level) => level switch
    {
        <= 9  => "bronze",
        <= 19 => "silver",
        <= 29 => "gold",
        <= 39 => "platinum",
        _     => "legendary",
    };

    public static string TitleForTier(string tier) => tier switch
    {
        "bronze"    => "Aspiring Engineer",
        "silver"    => "Rising Voice",
        "gold"      => "Industry Contributor",
        "platinum"  => "Sovereign Engineer",
        "legendary" => "Industry Authority",
        _           => "Aspiring Engineer",
    };

    public async Task<XpResultDto> LogXp(XpLogRequest req)
    {
        var profile = await db.BrandProfiles.FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("No brand profile found.");

        var tree = await db.SkillTrees
            .FirstOrDefaultAsync(t => t.Name == req.TreeName)
            ?? throw new ArgumentException($"Tree '{req.TreeName}' not found.");

        var log = new XpLog
        {
            TreeId      = tree.Id,
            PlatformId  = req.PlatformId,
            XpEarned    = req.XpEarned,
            Action      = req.Action,
            EvidenceUrl = req.EvidenceUrl,
            EarnedAt    = DateTime.UtcNow,
        };
        db.XpLogs.Add(log);

        // Update tree XP + level
        tree.TreeXp += req.XpEarned;
        bool leveledUp = false;
        while (tree.TreeXp >= tree.XpToNext)
        {
            tree.TreeXp -= tree.XpToNext;
            tree.TreeLevel++;
            tree.XpToNext = XpToNextLevel(tree.TreeLevel);
            leveledUp = true;
        }

        // Update global profile
        profile.TotalXp += req.XpEarned;
        var oldLevel = profile.GlobalLevel;
        int accumulated = 0;
        int checkLevel = 1;
        while (accumulated + XpToNextLevel(checkLevel) <= profile.TotalXp)
        {
            accumulated += XpToNextLevel(checkLevel);
            checkLevel++;
        }
        profile.GlobalLevel = checkLevel;
        profile.Tier = TierForLevel(profile.GlobalLevel);
        profile.Title = TitleForTier(profile.Tier);
        profile.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return new XpResultDto(
            req.XpEarned,
            tree.TreeXp,
            tree.TreeLevel,
            leveledUp || profile.GlobalLevel > oldLevel,
            profile.GlobalLevel,
            profile.TotalXp,
            profile.Tier,
            profile.Title
        );
    }
}
