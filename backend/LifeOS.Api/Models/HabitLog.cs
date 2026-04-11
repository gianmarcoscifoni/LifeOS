namespace LifeOS.Api.Models;

public class HabitLog
{
    public Guid Id { get; set; }
    public Guid HabitId { get; set; }
    public DateOnly LoggedDate { get; set; }
    public bool Completed { get; set; } = true;
    public string? Notes { get; set; }

    public Habit Habit { get; set; } = null!;
}
