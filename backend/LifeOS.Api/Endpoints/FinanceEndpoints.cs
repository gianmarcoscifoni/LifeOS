using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LifeOS.Api.Data;
using LifeOS.Api.DTOs;
using LifeOS.Api.Models;

namespace LifeOS.Api.Endpoints;

public static class FinanceEndpoints
{
    public static void MapFinanceEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/finance").WithTags("Finance");

        /// <summary>
        /// Restituisce il riepilogo finanziario con tutti i flussi di reddito.
        /// </summary>
        group.MapGet("/summary",
            [ProducesResponseType<FinanceSummaryDto>(200)]
            [ProducesResponseType(404)]
            async (LifeOsDbContext db) =>
            {
                var f = await db.Finances.Include(x => x.IncomeStreams).FirstOrDefaultAsync();
                if (f is null) return Results.NotFound();
                return Results.Ok(new FinanceSummaryDto(
                    f.Id, f.CurrentRal, f.TargetRal, f.Savings, f.MonthlyBurn, f.TargetDailyRate, f.Currency,
                    f.IncomeStreams.Select(i => new IncomeStreamDto(i.Id, i.Source, i.Amount, i.Frequency, i.Active)).ToList()
                ));
            })
            .WithName("GetFinanceSummary");

        /// <summary>
        /// Aggiorna i dati finanziari principali.
        /// </summary>
        group.MapPut("/update",
            [ProducesResponseType<FinanceSummaryDto>(200)]
            async (UpdateFinanceRequest req, LifeOsDbContext db) =>
            {
                var f = await db.Finances.Include(x => x.IncomeStreams).FirstOrDefaultAsync();
                if (f is null)
                {
                    f = new Finance { UpdatedAt = DateTime.UtcNow };
                    db.Finances.Add(f);
                }
                if (req.CurrentRal is not null) f.CurrentRal = req.CurrentRal;
                if (req.TargetRal is not null) f.TargetRal = req.TargetRal;
                if (req.Savings is not null) f.Savings = req.Savings.Value;
                if (req.MonthlyBurn is not null) f.MonthlyBurn = req.MonthlyBurn.Value;
                if (req.TargetDailyRate is not null) f.TargetDailyRate = req.TargetDailyRate;
                f.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
                return Results.Ok(new FinanceSummaryDto(
                    f.Id, f.CurrentRal, f.TargetRal, f.Savings, f.MonthlyBurn, f.TargetDailyRate, f.Currency,
                    f.IncomeStreams.Select(i => new IncomeStreamDto(i.Id, i.Source, i.Amount, i.Frequency, i.Active)).ToList()
                ));
            })
            .WithName("UpdateFinance");

        /// <summary>
        /// Simula la proiezione finanziaria verso un RAL target.
        /// </summary>
        group.MapGet("/simulate",
            [ProducesResponseType<FinanceSimulationDto>(200)]
            async (decimal targetRal, LifeOsDbContext db) =>
            {
                var f = await db.Finances.FirstOrDefaultAsync();
                var currentRal = f?.CurrentRal ?? 0m;
                var monthly = targetRal / 12m;
                var daily = targetRal / 220m;
                var gap = targetRal - currentRal;
                var monthsToTarget = currentRal > 0 ? gap / (currentRal * 0.1m) : 0;
                return Results.Ok(new FinanceSimulationDto(targetRal, monthly, daily, currentRal, gap, monthsToTarget));
            })
            .WithName("SimulateFinance");
    }
}
