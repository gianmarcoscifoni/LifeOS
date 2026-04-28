namespace LifeOS.Api.Models;

public class DailyCheckin
{
    public Guid     Id        { get; set; } = Guid.NewGuid();
    public DateOnly Date      { get; set; }
    public int      StreakDay { get; set; }   // day number within the current streak
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
