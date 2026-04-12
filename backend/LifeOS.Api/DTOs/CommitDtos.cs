namespace LifeOS.Api.DTOs;

public record CommitTranscriptRequest(
    string Transcript,
    string[] GoalTitles,
    bool CreateJournalEntry,
    string Mood,
    ExpenseMentionDto[] Expenses,
    ContentIdeaDto[] ContentIdeas,
    HabitMentionDto[] HabitMentions,
    XpRewardDto[] XpRewards);

public record CreatedGoalDto(Guid Id, string Title, string Area);
public record LoggedHabitDto(string Name, bool Found, bool Logged);

public record CommitResultDto(
    int TotalXpEarned,
    bool LeveledUp,
    int NewLevel,
    string NewTier,
    string NewTitle,
    CreatedGoalDto[] GoalsCreated,
    LoggedHabitDto[] HabitsLogged,
    bool JournalSaved,
    int ContentIdeasCreated,
    XpRewardDto[] RewardsGranted);
