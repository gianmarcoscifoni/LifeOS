namespace LifeOS.Api.DTOs;

public record FinanceSummaryDto(
    Guid Id,
    decimal? CurrentRal,
    decimal? TargetRal,
    decimal Savings,
    decimal MonthlyBurn,
    decimal? TargetDailyRate,
    string Currency,
    List<IncomeStreamDto> IncomeStreams
);

public record IncomeStreamDto(
    Guid Id,
    string Source,
    decimal Amount,
    string? Frequency,
    bool Active
);

public record UpdateFinanceRequest(
    decimal? CurrentRal,
    decimal? TargetRal,
    decimal? Savings,
    decimal? MonthlyBurn,
    decimal? TargetDailyRate
);

public record FinanceSimulationDto(
    decimal TargetRal,
    decimal TargetMonthly,
    decimal TargetDaily,
    decimal CurrentRal,
    decimal Gap,
    decimal MonthsToTarget
);
