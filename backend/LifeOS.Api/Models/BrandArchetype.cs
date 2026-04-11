namespace LifeOS.Api.Models;

public class BrandArchetype
{
    public Guid Id { get; set; }
    public Guid ProfileId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int AffinityPct { get; set; }
    public bool IsPrimary { get; set; }

    public BrandProfile Profile { get; set; } = null!;
}
