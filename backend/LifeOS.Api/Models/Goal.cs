namespace LifeOS.Api.Models;

public class Goal
{
    public Guid Id { get; set; }
    public Guid DomainId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? TargetDate { get; set; }
    public string Status { get; set; } = "not_started";
    public int ProgressPct { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public LifeDomain Domain { get; set; } = null!;
    public ICollection<Milestone> Milestones { get; set; } = new List<Milestone>();
    public ICollection<Habit> Habits { get; set; } = new List<Habit>();
}
