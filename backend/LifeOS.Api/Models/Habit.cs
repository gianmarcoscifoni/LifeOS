namespace LifeOS.Api.Models;

public class Habit
{
    public Guid Id { get; set; }
    public Guid? GoalId { get; set; }
    public Guid DomainId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Frequency { get; set; } = "daily";
    public int StreakCurrent { get; set; }
    public int StreakBest { get; set; }
    public bool Active { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public Goal? Goal { get; set; }
    public LifeDomain Domain { get; set; } = null!;
    public ICollection<HabitLog> HabitLogs { get; set; } = new List<HabitLog>();
}
