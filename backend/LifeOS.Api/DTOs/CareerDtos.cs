namespace LifeOS.Api.DTOs;

public record GoalDto(
    Guid Id,
    Guid DomainId,
    string Title,
    string? Description,
    DateOnly? TargetDate,
    string Status,
    int ProgressPct,
    DateTime CreatedAt,
    List<MilestoneDto> Milestones
);

public record MilestoneDto(
    Guid Id,
    Guid GoalId,
    string Title,
    DateOnly? TargetDate,
    bool Completed,
    DateTime? CompletedAt,
    int SortOrder
);

public record CreateGoalRequest(
    Guid DomainId,
    string Title,
    string? Description,
    DateOnly? TargetDate
);

public record UpdateGoalRequest(
    string? Title,
    string? Description,
    DateOnly? TargetDate,
    string? Status,
    int? ProgressPct
);

public record CreateMilestoneRequest(
    Guid GoalId,
    string Title,
    DateOnly? TargetDate,
    int SortOrder = 0
);

public record JobDto(
    Guid Id,
    string Company,
    string Role,
    decimal? Salary,
    string Currency,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string? WorkMode,
    bool IsCurrent
);

public record SkillDto(
    Guid Id,
    Guid? JobId,
    string Name,
    string? Level,
    bool Certified,
    string? CertName,
    DateOnly? CertDate
);
