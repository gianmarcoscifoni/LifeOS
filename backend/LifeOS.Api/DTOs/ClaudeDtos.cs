namespace LifeOS.Api.DTOs;

public record ClaudeAskRequest(string Question);

public record ClaudeAskResponse(string Answer);

public record WeeklyReviewDto(string Review, DateTime GeneratedAt);
