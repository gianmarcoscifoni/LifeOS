namespace LifeOS.Api.Models;

public class Finance
{
    public Guid Id { get; set; }
    public decimal? CurrentRal { get; set; }
    public decimal? TargetRal { get; set; }
    public decimal Savings { get; set; }
    public decimal MonthlyBurn { get; set; }
    public decimal? TargetDailyRate { get; set; }
    public string Currency { get; set; } = "EUR";
    public DateTime UpdatedAt { get; set; }

    public ICollection<IncomeStream> IncomeStreams { get; set; } = new List<IncomeStream>();
}
