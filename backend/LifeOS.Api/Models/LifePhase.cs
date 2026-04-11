namespace LifeOS.Api.Models;

public class LifePhase
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? LessonLearned { get; set; }
    public string? EnergyLevel { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<TurningPoint> TurningPoints { get; set; } = new List<TurningPoint>();
    public ICollection<MentalState> MentalStates { get; set; } = new List<MentalState>();
    public ICollection<Job> Jobs { get; set; } = new List<Job>();
}
