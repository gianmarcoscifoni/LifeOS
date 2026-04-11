namespace LifeOS.Api.Models;

public class BrandStat
{
    public Guid Id { get; set; }
    public Guid ProfileId { get; set; }
    public string StatName { get; set; } = string.Empty;
    public int BaseValue { get; set; }
    public int CurrentValue { get; set; }
    public int MaxValue { get; set; } = 100;

    public BrandProfile Profile { get; set; } = null!;
}
