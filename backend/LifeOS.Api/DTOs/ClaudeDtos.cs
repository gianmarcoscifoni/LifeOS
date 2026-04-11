namespace LifeOS.Api.DTOs;

public record MessageDto(string Role, string Content);

public record ClaudeAskRequest(
    string Message,
    List<MessageDto>? History = null);

public record ClaudeAskResponse(string Answer);

public record WeeklyReviewDto(string Review, DateTime GeneratedAt);

// Transcript analysis
public record TranscriptAnalysisRequest(string Transcript);
public record TopicDto(string Text, string Area, string Icon, double Confidence);
public record GoalSuggestionDto(string Title, string Area, string Priority, string? DueHint);
public record TranscriptAnalysisDto(
    string[] Keywords,
    TopicDto[] Topics,
    GoalSuggestionDto[] Goals,
    string Mood,
    string[] Gratitude,
    string CoachingMessage);
