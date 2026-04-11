namespace LifeOS.Api.Models;

public class SkillNode
{
    public Guid Id { get; set; }
    public Guid TreeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int LevelRequired { get; set; } = 1;
    public int XpReward { get; set; } = 100;
    public bool Unlocked { get; set; }
    public DateTime? UnlockedAt { get; set; }
    public int SortOrder { get; set; }

    public SkillTree Tree { get; set; } = null!;
    public ICollection<XpLog> XpLogs { get; set; } = new List<XpLog>();
}
