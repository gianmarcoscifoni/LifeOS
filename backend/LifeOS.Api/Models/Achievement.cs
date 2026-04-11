namespace LifeOS.Api.Models;

public class Achievement
{
    public Guid Id { get; set; }
    public Guid ProfileId { get; set; }
    public Guid? TreeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? BadgeIcon { get; set; }
    public int XpReward { get; set; } = 500;
    public bool Unlocked { get; set; }
    public DateTime? UnlockedAt { get; set; }
    public string? UnlockCondition { get; set; }
    public DateTime CreatedAt { get; set; }

    public BrandProfile Profile { get; set; } = null!;
    public SkillTree? Tree { get; set; }
}
