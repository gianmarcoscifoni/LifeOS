namespace LifeOS.Api.Models;

public class MentalState
{
    public Guid Id { get; set; }
    public Guid PhaseId { get; set; }
    public string PatternName { get; set; } = string.Empty;
    public string? Valence { get; set; }
    public string? TriggerDesc { get; set; }
    public string? Antidote { get; set; }
    public DateTime CreatedAt { get; set; }

    public LifePhase Phase { get; set; } = null!;
}
