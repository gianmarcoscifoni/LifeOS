namespace LifeOS.Api.DTOs;

public record JournalEntryDto(
    Guid Id,
    Guid? DomainId,
    DateOnly EntryDate,
    string Content,
    string? Mood,
    string[] Tags,
    string Source,
    DateTime CreatedAt
);

public record CreateJournalRequest(
    string Content,
    string? Mood = null,
    Guid? DomainId = null,
    DateOnly? EntryDate = null,
    string[]? Tags = null,
    string Source = "manual"
);

public record MoodTrendDto(DateOnly Date, string? Mood, int MoodScore);
