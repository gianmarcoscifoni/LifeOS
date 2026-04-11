namespace LifeOS.Api.Models;

public class BrandPillar
{
    public Guid Id { get; set; }
    public Guid ProfileId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Thesis { get; set; }
    public int WeightPct { get; set; } = 20;
    public string Status { get; set; } = "active";
    public DateTime CreatedAt { get; set; }

    public BrandProfile Profile { get; set; } = null!;
    public ICollection<ContentQueue> ContentItems { get; set; } = new List<ContentQueue>();
}
