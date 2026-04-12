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

// Shared across analysis + commit
public record ExpenseMentionDto(string Description, decimal? Amount, string? Category);
public record ContentIdeaDto(string Title, string Platform, string? Format);
public record HabitMentionDto(string Name, bool Completed);
public record XpRewardDto(string Action, int Xp, string Icon, string Area);

public record TranscriptAnalysisDto(
    string[] Keywords,
    TopicDto[] Topics,
    GoalSuggestionDto[] Goals,
    string Mood,
    string[] Gratitude,
    string CoachingMessage,
    ExpenseMentionDto[] Expenses,
    ContentIdeaDto[] ContentIdeas,
    HabitMentionDto[] HabitMentions,
    XpRewardDto[] XpRewards);
