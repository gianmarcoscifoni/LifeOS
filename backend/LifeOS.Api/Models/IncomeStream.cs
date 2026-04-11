namespace LifeOS.Api.Models;

public class IncomeStream
{
    public Guid Id { get; set; }
    public Guid FinanceId { get; set; }
    public string Source { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Frequency { get; set; }
    public bool Active { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public Finance Finance { get; set; } = null!;
}
