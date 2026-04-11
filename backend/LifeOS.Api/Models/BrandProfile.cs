namespace LifeOS.Api.Models;

public class BrandProfile
{
    public Guid Id { get; set; }
    public string Codename { get; set; } = string.Empty;
    public int GlobalLevel { get; set; } = 1;
    public int TotalXp { get; set; }
    public string Title { get; set; } = "Aspiring Engineer";
    public string Tier { get; set; } = "bronze";
    public string? OriginStory { get; set; }
    public string? MissionStatement { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<BrandStat> Stats { get; set; } = new List<BrandStat>();
    public ICollection<BrandArchetype> Archetypes { get; set; } = new List<BrandArchetype>();
    public ICollection<BrandPillar> Pillars { get; set; } = new List<BrandPillar>();
    public ICollection<SkillTree> SkillTrees { get; set; } = new List<SkillTree>();
    public ICollection<Platform> Platforms { get; set; } = new List<Platform>();
    public ICollection<Achievement> Achievements { get; set; } = new List<Achievement>();
}
