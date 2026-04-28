using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using LifeOS.Api.Models;

namespace LifeOS.Api.Data;

public class LifeOsDbContext(DbContextOptions<LifeOsDbContext> options) : DbContext(options)
{
    private static string ToSnakeCase(string name) =>
        Regex.Replace(name, "([a-z0-9])([A-Z])", "$1_$2").ToLowerInvariant();

    public DbSet<LifeDomain> LifeDomains => Set<LifeDomain>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Milestone> Milestones => Set<Milestone>();
    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<HabitLog> HabitLogs => Set<HabitLog>();
    public DbSet<LifePhase> LifePhases => Set<LifePhase>();
    public DbSet<TurningPoint> TurningPoints => Set<TurningPoint>();
    public DbSet<MentalState> MentalStates => Set<MentalState>();
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<Relationship> Relationships => Set<Relationship>();
    public DbSet<Finance> Finances => Set<Finance>();
    public DbSet<IncomeStream> IncomeStreams => Set<IncomeStream>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<BrandProfile> BrandProfiles => Set<BrandProfile>();
    public DbSet<BrandStat> BrandStats => Set<BrandStat>();
    public DbSet<BrandArchetype> BrandArchetypes => Set<BrandArchetype>();
    public DbSet<BrandPillar> BrandPillars => Set<BrandPillar>();
    public DbSet<SkillTree> SkillTrees => Set<SkillTree>();
    public DbSet<SkillNode> SkillNodes => Set<SkillNode>();
    public DbSet<XpLog> XpLogs => Set<XpLog>();
    public DbSet<Platform> Platforms => Set<Platform>();
    public DbSet<PlatformMetrics> PlatformMetrics => Set<PlatformMetrics>();
    public DbSet<ContentQueue> ContentQueue => Set<ContentQueue>();
    public DbSet<Achievement> Achievements => Set<Achievement>();
    public DbSet<Interview> Interviews => Set<Interview>();
    public DbSet<InterviewQA> InterviewQAs => Set<InterviewQA>();
    public DbSet<DailyCheckin> DailyCheckins => Set<DailyCheckin>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        // Apply snake_case naming to all tables and columns
        foreach (var entity in mb.Model.GetEntityTypes())
        {
            entity.SetTableName(ToSnakeCase(entity.GetTableName() ?? entity.ClrType.Name));
            foreach (var prop in entity.GetProperties())
                prop.SetColumnName(ToSnakeCase(prop.GetColumnName()));
            foreach (var key in entity.GetKeys())
                key.SetName(ToSnakeCase(key.GetName() ?? string.Empty));
            foreach (var fk in entity.GetForeignKeys())
                fk.SetConstraintName(ToSnakeCase(fk.GetConstraintName() ?? string.Empty));
            foreach (var idx in entity.GetIndexes())
                idx.SetDatabaseName(ToSnakeCase(idx.GetDatabaseName() ?? string.Empty));
        }

        // ── LifeDomain ───────────────────────────────────────────────────
        mb.Entity<LifeDomain>(e =>
        {
            e.Property(x => x.Status).HasDefaultValue("active");
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.Property(x => x.UpdatedAt).HasDefaultValueSql("NOW()");
        });

        // ── Goal ─────────────────────────────────────────────────────────
        mb.Entity<Goal>(e =>
        {
            e.Property(x => x.Status).HasDefaultValue("not_started");
            e.Property(x => x.ProgressPct).HasDefaultValue(0);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.Property(x => x.UpdatedAt).HasDefaultValueSql("NOW()");
            e.HasOne(x => x.Domain).WithMany(d => d.Goals).HasForeignKey(x => x.DomainId);
        });

        // ── Milestone ────────────────────────────────────────────────────
        mb.Entity<Milestone>(e =>
        {
            e.Property(x => x.Completed).HasDefaultValue(false);
            e.Property(x => x.SortOrder).HasDefaultValue(0);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.HasOne(x => x.Goal).WithMany(g => g.Milestones)
                .HasForeignKey(x => x.GoalId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── Habit ────────────────────────────────────────────────────────
        mb.Entity<Habit>(e =>
        {
            e.Property(x => x.Frequency).HasDefaultValue("daily");
            e.Property(x => x.StreakCurrent).HasDefaultValue(0);
            e.Property(x => x.StreakBest).HasDefaultValue(0);
            e.Property(x => x.Active).HasDefaultValue(true);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.HasOne(x => x.Domain).WithMany(d => d.Habits).HasForeignKey(x => x.DomainId);
            e.HasOne(x => x.Goal).WithMany(g => g.Habits).HasForeignKey(x => x.GoalId);
        });

        // ── HabitLog ─────────────────────────────────────────────────────
        mb.Entity<HabitLog>(e =>
        {
            e.Property(x => x.Completed).HasDefaultValue(true);
            e.HasIndex(x => new { x.HabitId, x.LoggedDate }).IsUnique();
            e.HasOne(x => x.Habit).WithMany(h => h.HabitLogs)
                .HasForeignKey(x => x.HabitId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── LifePhase ────────────────────────────────────────────────────
        mb.Entity<LifePhase>(e =>
        {
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
        });

        // ── TurningPoint ─────────────────────────────────────────────────
        mb.Entity<TurningPoint>(e =>
        {
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.HasOne(x => x.Phase).WithMany(p => p.TurningPoints).HasForeignKey(x => x.PhaseId);
        });

        // ── MentalState ──────────────────────────────────────────────────
        mb.Entity<MentalState>(e =>
        {
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.HasOne(x => x.Phase).WithMany(p => p.MentalStates).HasForeignKey(x => x.PhaseId);
        });

        // ── Job ──────────────────────────────────────────────────────────
        mb.Entity<Job>(e =>
        {
            e.Property(x => x.Currency).HasDefaultValue("EUR");
            e.Property(x => x.IsCurrent).HasDefaultValue(false);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.HasOne(x => x.Phase).WithMany(p => p.Jobs).HasForeignKey(x => x.PhaseId);
        });

        // ── Skill ────────────────────────────────────────────────────────
        mb.Entity<Skill>(e =>
        {
            e.Property(x => x.Certified).HasDefaultValue(false);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.HasOne(x => x.Job).WithMany(j => j.Skills).HasForeignKey(x => x.JobId);
        });

        // ── Relationship ─────────────────────────────────────────────────
        mb.Entity<Relationship>(e =>
        {
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
        });

        // ── Finance ──────────────────────────────────────────────────────
        mb.Entity<Finance>(e =>
        {
            e.Property(x => x.Savings).HasDefaultValue(0m);
            e.Property(x => x.MonthlyBurn).HasDefaultValue(0m);
            e.Property(x => x.Currency).HasDefaultValue("EUR");
            e.Property(x => x.UpdatedAt).HasDefaultValueSql("NOW()");
        });

        // ── IncomeStream ─────────────────────────────────────────────────
        mb.Entity<IncomeStream>(e =>
        {
            e.Property(x => x.Active).HasDefaultValue(true);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.HasOne(x => x.Finance).WithMany(f => f.IncomeStreams).HasForeignKey(x => x.FinanceId);
        });

        // ── JournalEntry ─────────────────────────────────────────────────
        mb.Entity<JournalEntry>(e =>
        {
            e.Property(x => x.Source).HasDefaultValue("manual");
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.Property(x => x.Tags).HasColumnType("text[]");
            e.HasOne(x => x.Domain).WithMany(d => d.JournalEntries).HasForeignKey(x => x.DomainId);
        });

        // ── BrandProfile ─────────────────────────────────────────────────
        mb.Entity<BrandProfile>(e =>
        {
            e.Property(x => x.GlobalLevel).HasDefaultValue(1);
            e.Property(x => x.TotalXp).HasDefaultValue(0);
            e.Property(x => x.Title).HasDefaultValue("Aspiring Engineer");
            e.Property(x => x.Tier).HasDefaultValue("bronze");
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.Property(x => x.UpdatedAt).HasDefaultValueSql("NOW()");
        });

        // ── BrandStat ────────────────────────────────────────────────────
        mb.Entity<BrandStat>(e =>
        {
            e.Property(x => x.BaseValue).HasDefaultValue(0);
            e.Property(x => x.CurrentValue).HasDefaultValue(0);
            e.Property(x => x.MaxValue).HasDefaultValue(100);
            e.HasIndex(x => new { x.ProfileId, x.StatName }).IsUnique();
            e.HasOne(x => x.Profile).WithMany(p => p.Stats).HasForeignKey(x => x.ProfileId);
        });

        // ── BrandArchetype ───────────────────────────────────────────────
        mb.Entity<BrandArchetype>(e =>
        {
            e.Property(x => x.AffinityPct).HasDefaultValue(0);
            e.Property(x => x.IsPrimary).HasDefaultValue(false);
            e.HasOne(x => x.Profile).WithMany(p => p.Archetypes).HasForeignKey(x => x.ProfileId);
        });

        // ── BrandPillar ──────────────────────────────────────────────────
        mb.Entity<BrandPillar>(e =>
        {
            e.Property(x => x.WeightPct).HasDefaultValue(20);
            e.Property(x => x.Status).HasDefaultValue("active");
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.HasOne(x => x.Profile).WithMany(p => p.Pillars).HasForeignKey(x => x.ProfileId);
        });

        // ── SkillTree ────────────────────────────────────────────────────
        mb.Entity<SkillTree>(e =>
        {
            e.Property(x => x.TreeLevel).HasDefaultValue(1);
            e.Property(x => x.TreeXp).HasDefaultValue(0);
            e.Property(x => x.XpToNext).HasDefaultValue(1000);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.HasOne(x => x.Profile).WithMany(p => p.SkillTrees).HasForeignKey(x => x.ProfileId);
            e.HasOne(x => x.Domain).WithMany(d => d.SkillTrees).HasForeignKey(x => x.DomainId);
        });

        // ── SkillNode ────────────────────────────────────────────────────
        mb.Entity<SkillNode>(e =>
        {
            e.Property(x => x.LevelRequired).HasDefaultValue(1);
            e.Property(x => x.XpReward).HasDefaultValue(100);
            e.Property(x => x.Unlocked).HasDefaultValue(false);
            e.Property(x => x.SortOrder).HasDefaultValue(0);
            e.HasOne(x => x.Tree).WithMany(t => t.Nodes).HasForeignKey(x => x.TreeId);
        });

        // ── XpLog ────────────────────────────────────────────────────────
        mb.Entity<XpLog>(e =>
        {
            e.Property(x => x.EarnedAt).HasDefaultValueSql("NOW()");
            e.HasOne(x => x.Tree).WithMany(t => t.XpLogs).HasForeignKey(x => x.TreeId);
            e.HasOne(x => x.Node).WithMany(n => n.XpLogs).HasForeignKey(x => x.NodeId);
            e.HasOne(x => x.Platform).WithMany(p => p.XpLogs).HasForeignKey(x => x.PlatformId);
        });

        // ── Platform ─────────────────────────────────────────────────────
        mb.Entity<Platform>(e =>
        {
            e.Property(x => x.Status).HasDefaultValue("active");
            e.Property(x => x.Priority).HasDefaultValue(0);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.HasOne(x => x.Profile).WithMany(p => p.Platforms).HasForeignKey(x => x.ProfileId);
        });

        // ── PlatformMetrics ──────────────────────────────────────────────
        mb.Entity<PlatformMetrics>(e =>
        {
            e.Property(x => x.Followers).HasDefaultValue(0);
            e.Property(x => x.Impressions).HasDefaultValue(0);
            e.Property(x => x.EngagementRate).HasDefaultValue(0m);
            e.Property(x => x.PostsCount).HasDefaultValue(0);
            e.Property(x => x.ProfileViews).HasDefaultValue(0);
            e.HasIndex(x => new { x.PlatformId, x.SnapshotDate }).IsUnique();
            e.HasOne(x => x.Platform).WithMany(p => p.Metrics).HasForeignKey(x => x.PlatformId);
        });

        // ── ContentQueue ─────────────────────────────────────────────────
        mb.Entity<ContentQueue>(e =>
        {
            e.Property(x => x.Status).HasDefaultValue("idea");
            e.Property(x => x.XpOnPublish).HasDefaultValue(50);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.Property(x => x.UpdatedAt).HasDefaultValueSql("NOW()");
            e.HasOne(x => x.Platform).WithMany(p => p.ContentItems).HasForeignKey(x => x.PlatformId);
            e.HasOne(x => x.Pillar).WithMany(p => p.ContentItems).HasForeignKey(x => x.PillarId);
            e.HasOne(x => x.Tree).WithMany(t => t.ContentItems).HasForeignKey(x => x.TreeId);
        });

        // ── Achievement ──────────────────────────────────────────────────
        mb.Entity<Achievement>(e =>
        {
            e.Property(x => x.XpReward).HasDefaultValue(500);
            e.Property(x => x.Unlocked).HasDefaultValue(false);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.HasOne(x => x.Profile).WithMany(p => p.Achievements).HasForeignKey(x => x.ProfileId);
            e.HasOne(x => x.Tree).WithMany(t => t.Achievements).HasForeignKey(x => x.TreeId);
        });

        // ── DailyCheckin ─────────────────────────────────────────────────
        mb.Entity<DailyCheckin>(e =>
        {
            e.HasIndex(x => x.Date).IsUnique();
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
        });

        // ── Interview ────────────────────────────────────────────────────
        mb.Entity<Interview>(e =>
        {
            e.Property(x => x.Status).HasDefaultValue("scheduled");
            e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
            e.Property(x => x.UpdatedAt).HasDefaultValueSql("NOW()");
        });

        // ── InterviewQA ──────────────────────────────────────────────────
        mb.Entity<InterviewQA>(e =>
        {
            e.Property(x => x.SortOrder).HasDefaultValue(0);
            e.HasOne(x => x.Interview).WithMany(i => i.QaPairs)
                .HasForeignKey(x => x.InterviewId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
