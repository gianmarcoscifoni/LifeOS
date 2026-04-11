namespace LifeOS.Api.Models;

public class Platform
{
    public Guid Id { get; set; }
    public Guid ProfileId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Handle { get; set; }
    public string? Url { get; set; }
    public string Status { get; set; } = "active";
    public int Priority { get; set; }
    public DateOnly? JoinedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public BrandProfile Profile { get; set; } = null!;
    public ICollection<PlatformMetrics> Metrics { get; set; } = new List<PlatformMetrics>();
    public ICollection<ContentQueue> ContentItems { get; set; } = new List<ContentQueue>();
    public ICollection<XpLog> XpLogs { get; set; } = new List<XpLog>();
}
