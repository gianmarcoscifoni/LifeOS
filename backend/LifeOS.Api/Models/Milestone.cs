namespace LifeOS.Api.Models;

public class Milestone
{
    public Guid Id { get; set; }
    public Guid GoalId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateOnly? TargetDate { get; set; }
    public bool Completed { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }

    public Goal Goal { get; set; } = null!;
}
