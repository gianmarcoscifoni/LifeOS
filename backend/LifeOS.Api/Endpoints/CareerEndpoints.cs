using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LifeOS.Api.Data;
using LifeOS.Api.DTOs;
using LifeOS.Api.Models;

namespace LifeOS.Api.Endpoints;

public static class CareerEndpoints
{
    public static void MapCareerEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/career").WithTags("Career");

        /// <summary>
        /// Restituisce tutti gli obiettivi con i rispettivi traguardi.
        /// </summary>
        group.MapGet("/goals",
            [ProducesResponseType<List<GoalDto>>(200)]
            async (LifeOsDbContext db, string? status) =>
            {
                var q = db.Goals.Include(g => g.Milestones.OrderBy(m => m.SortOrder)).AsQueryable();
                if (status is not null) q = q.Where(g => g.Status == status);
                var goals = await q.OrderByDescending(g => g.CreatedAt).ToListAsync();
                return Results.Ok(goals.Select(g => ToDto(g)).ToList());
            })
            .WithName("GetGoals");

        /// <summary>
        /// Crea un nuovo obiettivo per un dominio di vita.
        /// </summary>
        group.MapPost("/goals",
            [ProducesResponseType<GoalDto>(201)]
            [ProducesResponseType(400)]
            async (CreateGoalRequest req, LifeOsDbContext db) =>
            {
                var goal = new Goal
                {
                    DomainId    = req.DomainId,
                    Title       = req.Title,
                    Description = req.Description,
                    TargetDate  = req.TargetDate,
                    Status      = "not_started",
                    CreatedAt   = DateTime.UtcNow,
                    UpdatedAt   = DateTime.UtcNow,
                };
                db.Goals.Add(goal);
                await db.SaveChangesAsync();
                return Results.Created($"/api/career/goals/{goal.Id}", ToDto(goal));
            })
            .WithName("CreateGoal");

        /// <summary>
        /// Aggiorna stato o progresso di un obiettivo.
        /// </summary>
        group.MapPatch("/goals/{id:guid}",
            [ProducesResponseType<GoalDto>(200)]
            [ProducesResponseType(404)]
            async (Guid id, UpdateGoalRequest req, LifeOsDbContext db) =>
            {
                var goal = await db.Goals.Include(g => g.Milestones).FirstOrDefaultAsync(g => g.Id == id);
                if (goal is null) return Results.NotFound();
                if (req.Title is not null) goal.Title = req.Title;
                if (req.Description is not null) goal.Description = req.Description;
                if (req.TargetDate is not null) goal.TargetDate = req.TargetDate;
                if (req.Status is not null) goal.Status = req.Status;
                if (req.ProgressPct is not null) goal.ProgressPct = req.ProgressPct.Value;
                goal.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
                return Results.Ok(ToDto(goal));
            })
            .WithName("UpdateGoal");

        /// <summary>
        /// Restituisce tutti i traguardi, con filtro opzionale per goal.
        /// </summary>
        group.MapGet("/milestones",
            [ProducesResponseType<List<MilestoneDto>>(200)]
            async (LifeOsDbContext db, Guid? goalId) =>
            {
                var q = db.Milestones.AsQueryable();
                if (goalId is not null) q = q.Where(m => m.GoalId == goalId);
                var list = await q.OrderBy(m => m.SortOrder).ToListAsync();
                return Results.Ok(list.Select(m => new MilestoneDto(m.Id, m.GoalId, m.Title, m.TargetDate, m.Completed, m.CompletedAt, m.SortOrder)).ToList());
            })
            .WithName("GetMilestones");

        /// <summary>
        /// Crea un nuovo traguardo per un obiettivo.
        /// </summary>
        group.MapPost("/milestones",
            [ProducesResponseType<MilestoneDto>(201)]
            async (CreateMilestoneRequest req, LifeOsDbContext db) =>
            {
                var m = new Milestone
                {
                    GoalId     = req.GoalId,
                    Title      = req.Title,
                    TargetDate = req.TargetDate,
                    SortOrder  = req.SortOrder,
                    CreatedAt  = DateTime.UtcNow,
                };
                db.Milestones.Add(m);
                await db.SaveChangesAsync();
                return Results.Created($"/api/career/milestones/{m.Id}",
                    new MilestoneDto(m.Id, m.GoalId, m.Title, m.TargetDate, m.Completed, m.CompletedAt, m.SortOrder));
            })
            .WithName("CreateMilestone");

        /// <summary>
        /// Contrassegna un traguardo come completato.
        /// </summary>
        group.MapPatch("/milestones/{id:guid}/complete",
            [ProducesResponseType<MilestoneDto>(200)]
            [ProducesResponseType(404)]
            async (Guid id, LifeOsDbContext db) =>
            {
                var m = await db.Milestones.FindAsync(id);
                if (m is null) return Results.NotFound();
                m.Completed = true;
                m.CompletedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
                return Results.Ok(new MilestoneDto(m.Id, m.GoalId, m.Title, m.TargetDate, m.Completed, m.CompletedAt, m.SortOrder));
            })
            .WithName("CompleteMilestone");
    }

    private static GoalDto ToDto(Goal g) => new(
        g.Id, g.DomainId, g.Title, g.Description, g.TargetDate, g.Status, g.ProgressPct, g.CreatedAt,
        g.Milestones.Select(m => new MilestoneDto(m.Id, m.GoalId, m.Title, m.TargetDate, m.Completed, m.CompletedAt, m.SortOrder)).ToList()
    );
}
