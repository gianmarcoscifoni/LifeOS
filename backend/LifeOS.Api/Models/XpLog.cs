namespace LifeOS.Api.Models;

public class XpLog
{
    public Guid Id { get; set; }
    public Guid? NodeId { get; set; }
    public Guid TreeId { get; set; }
    public Guid? PlatformId { get; set; }
    public int XpEarned { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? EvidenceUrl { get; set; }
    public DateTime EarnedAt { get; set; }

    public SkillNode? Node { get; set; }
    public SkillTree Tree { get; set; } = null!;
    public Platform? Platform { get; set; }
}
