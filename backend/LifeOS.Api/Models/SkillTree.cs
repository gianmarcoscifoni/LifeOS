namespace LifeOS.Api.Models;

public class SkillTree
{
    public Guid Id { get; set; }
    public Guid ProfileId { get; set; }
    public Guid? DomainId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int TreeLevel { get; set; } = 1;
    public int TreeXp { get; set; }
    public int XpToNext { get; set; } = 1000;
    public string? Icon { get; set; }
    public DateTime CreatedAt { get; set; }

    public BrandProfile Profile { get; set; } = null!;
    public LifeDomain? Domain { get; set; }
    public ICollection<SkillNode> Nodes { get; set; } = new List<SkillNode>();
    public ICollection<XpLog> XpLogs { get; set; } = new List<XpLog>();
    public ICollection<ContentQueue> ContentItems { get; set; } = new List<ContentQueue>();
    public ICollection<Achievement> Achievements { get; set; } = new List<Achievement>();
}
