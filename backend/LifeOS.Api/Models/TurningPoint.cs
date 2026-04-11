namespace LifeOS.Api.Models;

public class TurningPoint
{
    public Guid Id { get; set; }
    public Guid PhaseId { get; set; }
    public string Event { get; set; } = string.Empty;
    public DateOnly? EventDate { get; set; }
    public string? Reflection { get; set; }
    public string? Impact { get; set; }
    public DateTime CreatedAt { get; set; }

    public LifePhase Phase { get; set; } = null!;
}
