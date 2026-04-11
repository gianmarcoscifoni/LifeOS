namespace LifeOS.Api.Models;

public class PlatformMetrics
{
    public Guid Id { get; set; }
    public Guid PlatformId { get; set; }
    public DateOnly SnapshotDate { get; set; }
    public int Followers { get; set; }
    public int Impressions { get; set; }
    public decimal EngagementRate { get; set; }
    public int PostsCount { get; set; }
    public int ProfileViews { get; set; }

    public Platform Platform { get; set; } = null!;
}
