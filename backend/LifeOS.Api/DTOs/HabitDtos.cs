namespace LifeOS.Api.DTOs;

public record HabitDto(
    Guid Id,
    Guid DomainId,
    Guid? GoalId,
    string Name,
    string Frequency,
    int StreakCurrent,
    int StreakBest,
    bool Active
);

public record HabitLogDto(
    Guid Id,
    Guid HabitId,
    DateOnly LoggedDate,
    bool Completed,
    string? Notes
);

public record CreateHabitRequest(
    string Name,
    string Frequency = "daily",
    Guid? DomainId = null,
    Guid? GoalId = null
);

public record LogHabitRequest(
    DateOnly? LoggedDate = null,
    bool Completed = true,
    string? Notes = null
);

public record HabitStreakDto(Guid HabitId, int StreakCurrent, int StreakBest);

public record TodayHabitsDto(
    List<HabitDto> Habits,
    List<HabitLogDto> TodayLogs,
    int CompletedCount,
    int TotalCount
);
