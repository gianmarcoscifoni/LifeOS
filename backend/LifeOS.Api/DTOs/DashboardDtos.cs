namespace LifeOS.Api.DTOs;

public record DashboardOverviewDto(
    BrandSnapshotDto Brand,
    HabitsSnapshotDto Habits,
    FinanceSnapshotDto Finance,
    CareerSnapshotDto Career,
    ContentSnapshotDto Content
);

public record BrandSnapshotDto(
    string Codename,
    int GlobalLevel,
    int TotalXp,
    string Title,
    string Tier,
    int XpToNextLevel
);

public record HabitsSnapshotDto(
    int TotalHabits,
    int CompletedToday,
    int LongestStreak
);

public record FinanceSnapshotDto(
    decimal? CurrentRal,
    decimal? TargetRal,
    decimal Savings,
    decimal MonthlyBurn
);

public record CareerSnapshotDto(
    int ActiveGoals,
    int CompletedGoals,
    string? CurrentJob
);

public record ContentSnapshotDto(
    int IdeasCount,
    int ReadyCount,
    int PublishedThisMonth
);
