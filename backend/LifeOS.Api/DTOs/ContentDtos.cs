namespace LifeOS.Api.DTOs;

public record ContentQueueDto(
    Guid Id,
    Guid PlatformId,
    string PlatformName,
    Guid? PillarId,
    string? PillarName,
    Guid? TreeId,
    string? TreeName,
    string Title,
    string? Draft,
    string Status,
    DateOnly? ScheduledFor,
    DateTime? PublishedAt,
    string? Format,
    int XpOnPublish,
    DateTime CreatedAt
);

public record CreateContentRequest(
    string Title,
    Guid? PlatformId = null,
    string? Draft = null,
    Guid? PillarId = null,
    Guid? TreeId = null,
    string? Format = null,
    DateOnly? ScheduledFor = null
);

public record UpdateContentRequest(
    string? Title,
    string? Draft,
    string? Status,
    Guid? PillarId,
    Guid? TreeId,
    string? Format,
    DateOnly? ScheduledFor
);

public record BrandPillarDto(
    Guid Id,
    string Name,
    string? Thesis,
    int WeightPct,
    string Status
);
