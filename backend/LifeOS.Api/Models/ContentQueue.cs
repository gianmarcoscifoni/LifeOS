namespace LifeOS.Api.Models;

public class ContentQueue
{
    public Guid Id { get; set; }
    public Guid PlatformId { get; set; }
    public Guid? PillarId { get; set; }
    public Guid? TreeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Draft { get; set; }
    public string Status { get; set; } = "idea";
    public DateOnly? ScheduledFor { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string? Format { get; set; }
    public int XpOnPublish { get; set; } = 50;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Platform Platform { get; set; } = null!;
    public BrandPillar? Pillar { get; set; }
    public SkillTree? Tree { get; set; }
}
