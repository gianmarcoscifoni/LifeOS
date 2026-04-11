namespace LifeOS.Api.DTOs;

public record BrandStatDto(string StatName, int BaseValue, int CurrentValue, int MaxValue);

public record BrandArchetypeDto(string Name, string? Description, int AffinityPct, bool IsPrimary);

public record BrandProfileDto(
    Guid Id,
    string Codename,
    int GlobalLevel,
    int TotalXp,
    string Title,
    string Tier,
    string? OriginStory,
    string? MissionStatement,
    string? AvatarUrl,
    List<BrandStatDto> Stats,
    List<BrandArchetypeDto> Archetypes
);

public record XpLogRequest(
    string Action,
    int XpEarned,
    string TreeName,
    string? EvidenceUrl = null,
    Guid? PlatformId = null
);

public record XpResultDto(
    int XpEarned,
    int NewTreeXp,
    int TreeLevel,
    bool LeveledUp,
    int GlobalLevel,
    int TotalXp,
    string Tier,
    string Title
);

public record SkillTreeDto(
    Guid Id,
    string Name,
    int TreeLevel,
    int TreeXp,
    int XpToNext,
    string? Icon,
    List<SkillNodeDto> Nodes
);

public record SkillNodeDto(
    Guid Id,
    string Name,
    string? Description,
    int LevelRequired,
    int XpReward,
    bool Unlocked,
    int SortOrder
);

public record AchievementDto(
    Guid Id,
    string Name,
    string? Description,
    string? BadgeIcon,
    int XpReward,
    bool Unlocked,
    DateTime? UnlockedAt,
    string? UnlockCondition
);
