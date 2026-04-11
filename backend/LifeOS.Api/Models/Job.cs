namespace LifeOS.Api.Models;

public class Job
{
    public Guid Id { get; set; }
    public Guid? PhaseId { get; set; }
    public string Company { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public decimal? Salary { get; set; }
    public string Currency { get; set; } = "EUR";
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? WorkMode { get; set; }
    public bool IsCurrent { get; set; }
    public DateTime CreatedAt { get; set; }

    public LifePhase? Phase { get; set; }
    public ICollection<Skill> Skills { get; set; } = new List<Skill>();
}
