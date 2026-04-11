using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "brand_profiles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    codename = table.Column<string>(type: "text", nullable: false),
                    global_level = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    total_xp = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    title = table.Column<string>(type: "text", nullable: false, defaultValue: "Aspiring Engineer"),
                    tier = table.Column<string>(type: "text", nullable: false, defaultValue: "bronze"),
                    origin_story = table.Column<string>(type: "text", nullable: true),
                    mission_statement = table.Column<string>(type: "text", nullable: true),
                    avatar_url = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_brand_profiles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "finances",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    current_ral = table.Column<decimal>(type: "numeric", nullable: true),
                    target_ral = table.Column<decimal>(type: "numeric", nullable: true),
                    savings = table.Column<decimal>(type: "numeric", nullable: false, defaultValue: 0m),
                    monthly_burn = table.Column<decimal>(type: "numeric", nullable: false, defaultValue: 0m),
                    target_daily_rate = table.Column<decimal>(type: "numeric", nullable: true),
                    currency = table.Column<string>(type: "text", nullable: false, defaultValue: "EUR"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_finances", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "life_domains",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    icon = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "active"),
                    priority = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_life_domains", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "life_phases",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    lesson_learned = table.Column<string>(type: "text", nullable: true),
                    energy_level = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_life_phases", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "relationships",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    type = table.Column<string>(type: "text", nullable: true),
                    role_in_story = table.Column<string>(type: "text", nullable: true),
                    current_status = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_relationships", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "brand_archetypes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    affinity_pct = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_brand_archetypes", x => x.id);
                    table.ForeignKey(
                        name: "fk_brand_archetypes_brand_profiles_profile_id",
                        column: x => x.profile_id,
                        principalTable: "brand_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "brand_pillars",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    thesis = table.Column<string>(type: "text", nullable: true),
                    weight_pct = table.Column<int>(type: "integer", nullable: false, defaultValue: 20),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "active"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_brand_pillars", x => x.id);
                    table.ForeignKey(
                        name: "fk_brand_pillars_brand_profiles_profile_id",
                        column: x => x.profile_id,
                        principalTable: "brand_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "brand_stats",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    stat_name = table.Column<string>(type: "text", nullable: false),
                    base_value = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    current_value = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    max_value = table.Column<int>(type: "integer", nullable: false, defaultValue: 100)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_brand_stats", x => x.id);
                    table.ForeignKey(
                        name: "fk_brand_stats_brand_profiles_profile_id",
                        column: x => x.profile_id,
                        principalTable: "brand_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "platforms",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    handle = table.Column<string>(type: "text", nullable: true),
                    url = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "active"),
                    priority = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    joined_at = table.Column<DateOnly>(type: "date", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_platforms", x => x.id);
                    table.ForeignKey(
                        name: "fk_platforms_brand_profiles_profile_id",
                        column: x => x.profile_id,
                        principalTable: "brand_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "income_streams",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    finance_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source = table.Column<string>(type: "text", nullable: false),
                    amount = table.Column<decimal>(type: "numeric", nullable: false),
                    frequency = table.Column<string>(type: "text", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_income_streams", x => x.id);
                    table.ForeignKey(
                        name: "fk_income_streams_finances_finance_id",
                        column: x => x.finance_id,
                        principalTable: "finances",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "goals",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    domain_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    target_date = table.Column<DateOnly>(type: "date", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "not_started"),
                    progress_pct = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_goals", x => x.id);
                    table.ForeignKey(
                        name: "fk_goals_life_domains_domain_id",
                        column: x => x.domain_id,
                        principalTable: "life_domains",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "journal_entries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    domain_id = table.Column<Guid>(type: "uuid", nullable: true),
                    entry_date = table.Column<DateOnly>(type: "date", nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    mood = table.Column<string>(type: "text", nullable: true),
                    tags = table.Column<string[]>(type: "text[]", nullable: false),
                    source = table.Column<string>(type: "text", nullable: false, defaultValue: "manual"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_journal_entries", x => x.id);
                    table.ForeignKey(
                        name: "fk_journal_entries_life_domains_domain_id",
                        column: x => x.domain_id,
                        principalTable: "life_domains",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "skill_trees",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    domain_id = table.Column<Guid>(type: "uuid", nullable: true),
                    name = table.Column<string>(type: "text", nullable: false),
                    tree_level = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    tree_xp = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    xp_to_next = table.Column<int>(type: "integer", nullable: false, defaultValue: 1000),
                    icon = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_skill_trees", x => x.id);
                    table.ForeignKey(
                        name: "fk_skill_trees_brand_profiles_profile_id",
                        column: x => x.profile_id,
                        principalTable: "brand_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_skill_trees_life_domains_domain_id",
                        column: x => x.domain_id,
                        principalTable: "life_domains",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "jobs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    phase_id = table.Column<Guid>(type: "uuid", nullable: true),
                    company = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "text", nullable: false),
                    salary = table.Column<decimal>(type: "numeric", nullable: true),
                    currency = table.Column<string>(type: "text", nullable: false, defaultValue: "EUR"),
                    start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    work_mode = table.Column<string>(type: "text", nullable: true),
                    is_current = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_jobs", x => x.id);
                    table.ForeignKey(
                        name: "fk_jobs_life_phases_phase_id",
                        column: x => x.phase_id,
                        principalTable: "life_phases",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "mental_states",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    phase_id = table.Column<Guid>(type: "uuid", nullable: false),
                    pattern_name = table.Column<string>(type: "text", nullable: false),
                    valence = table.Column<string>(type: "text", nullable: true),
                    trigger_desc = table.Column<string>(type: "text", nullable: true),
                    antidote = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_mental_states", x => x.id);
                    table.ForeignKey(
                        name: "fk_mental_states_life_phases_phase_id",
                        column: x => x.phase_id,
                        principalTable: "life_phases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "turning_points",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    phase_id = table.Column<Guid>(type: "uuid", nullable: false),
                    @event = table.Column<string>(name: "event", type: "text", nullable: false),
                    event_date = table.Column<DateOnly>(type: "date", nullable: true),
                    reflection = table.Column<string>(type: "text", nullable: true),
                    impact = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_turning_points", x => x.id);
                    table.ForeignKey(
                        name: "fk_turning_points_life_phases_phase_id",
                        column: x => x.phase_id,
                        principalTable: "life_phases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "platform_metrics",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    platform_id = table.Column<Guid>(type: "uuid", nullable: false),
                    snapshot_date = table.Column<DateOnly>(type: "date", nullable: false),
                    followers = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    impressions = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    engagement_rate = table.Column<decimal>(type: "numeric", nullable: false, defaultValue: 0m),
                    posts_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    profile_views = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_platform_metrics", x => x.id);
                    table.ForeignKey(
                        name: "fk_platform_metrics_platforms_platform_id",
                        column: x => x.platform_id,
                        principalTable: "platforms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "habits",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    goal_id = table.Column<Guid>(type: "uuid", nullable: true),
                    domain_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    frequency = table.Column<string>(type: "text", nullable: false, defaultValue: "daily"),
                    streak_current = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    streak_best = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_habits", x => x.id);
                    table.ForeignKey(
                        name: "fk_habits_goals_goal_id",
                        column: x => x.goal_id,
                        principalTable: "goals",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_habits_life_domains_domain_id",
                        column: x => x.domain_id,
                        principalTable: "life_domains",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "milestones",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    goal_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    target_date = table.Column<DateOnly>(type: "date", nullable: true),
                    completed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_milestones", x => x.id);
                    table.ForeignKey(
                        name: "fk_milestones_goals_goal_id",
                        column: x => x.goal_id,
                        principalTable: "goals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "achievements",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tree_id = table.Column<Guid>(type: "uuid", nullable: true),
                    name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    badge_icon = table.Column<string>(type: "text", nullable: true),
                    xp_reward = table.Column<int>(type: "integer", nullable: false, defaultValue: 500),
                    unlocked = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    unlocked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    unlock_condition = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_achievements", x => x.id);
                    table.ForeignKey(
                        name: "fk_achievements_brand_profiles_profile_id",
                        column: x => x.profile_id,
                        principalTable: "brand_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_achievements_skill_trees_tree_id",
                        column: x => x.tree_id,
                        principalTable: "skill_trees",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "content_queue",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    platform_id = table.Column<Guid>(type: "uuid", nullable: false),
                    pillar_id = table.Column<Guid>(type: "uuid", nullable: true),
                    tree_id = table.Column<Guid>(type: "uuid", nullable: true),
                    title = table.Column<string>(type: "text", nullable: false),
                    draft = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "idea"),
                    scheduled_for = table.Column<DateOnly>(type: "date", nullable: true),
                    published_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    format = table.Column<string>(type: "text", nullable: true),
                    xp_on_publish = table.Column<int>(type: "integer", nullable: false, defaultValue: 50),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_content_queue", x => x.id);
                    table.ForeignKey(
                        name: "fk_content_queue_brand_pillars_pillar_id",
                        column: x => x.pillar_id,
                        principalTable: "brand_pillars",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_content_queue_platforms_platform_id",
                        column: x => x.platform_id,
                        principalTable: "platforms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_content_queue_skill_trees_tree_id",
                        column: x => x.tree_id,
                        principalTable: "skill_trees",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "skill_nodes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tree_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    level_required = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    xp_reward = table.Column<int>(type: "integer", nullable: false, defaultValue: 100),
                    unlocked = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    unlocked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_skill_nodes", x => x.id);
                    table.ForeignKey(
                        name: "fk_skill_nodes_skill_trees_tree_id",
                        column: x => x.tree_id,
                        principalTable: "skill_trees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "skills",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    job_id = table.Column<Guid>(type: "uuid", nullable: true),
                    name = table.Column<string>(type: "text", nullable: false),
                    level = table.Column<string>(type: "text", nullable: true),
                    certified = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    cert_name = table.Column<string>(type: "text", nullable: true),
                    cert_date = table.Column<DateOnly>(type: "date", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_skills", x => x.id);
                    table.ForeignKey(
                        name: "fk_skills_jobs_job_id",
                        column: x => x.job_id,
                        principalTable: "jobs",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "habit_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    habit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    logged_date = table.Column<DateOnly>(type: "date", nullable: false),
                    completed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_habit_logs", x => x.id);
                    table.ForeignKey(
                        name: "fk_habit_logs_habits_habit_id",
                        column: x => x.habit_id,
                        principalTable: "habits",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "xp_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    node_id = table.Column<Guid>(type: "uuid", nullable: true),
                    tree_id = table.Column<Guid>(type: "uuid", nullable: false),
                    platform_id = table.Column<Guid>(type: "uuid", nullable: true),
                    xp_earned = table.Column<int>(type: "integer", nullable: false),
                    action = table.Column<string>(type: "text", nullable: false),
                    evidence_url = table.Column<string>(type: "text", nullable: true),
                    earned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_xp_logs", x => x.id);
                    table.ForeignKey(
                        name: "fk_xp_logs_platforms_platform_id",
                        column: x => x.platform_id,
                        principalTable: "platforms",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_xp_logs_skill_nodes_node_id",
                        column: x => x.node_id,
                        principalTable: "skill_nodes",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_xp_logs_skill_trees_tree_id",
                        column: x => x.tree_id,
                        principalTable: "skill_trees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_achievements_profile_id",
                table: "achievements",
                column: "profile_id");

            migrationBuilder.CreateIndex(
                name: "ix_achievements_tree_id",
                table: "achievements",
                column: "tree_id");

            migrationBuilder.CreateIndex(
                name: "ix_brand_archetypes_profile_id",
                table: "brand_archetypes",
                column: "profile_id");

            migrationBuilder.CreateIndex(
                name: "ix_brand_pillars_profile_id",
                table: "brand_pillars",
                column: "profile_id");

            migrationBuilder.CreateIndex(
                name: "IX_brand_stats_profile_id_stat_name",
                table: "brand_stats",
                columns: new[] { "profile_id", "stat_name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_content_queue_pillar_id",
                table: "content_queue",
                column: "pillar_id");

            migrationBuilder.CreateIndex(
                name: "ix_content_queue_platform_id",
                table: "content_queue",
                column: "platform_id");

            migrationBuilder.CreateIndex(
                name: "ix_content_queue_tree_id",
                table: "content_queue",
                column: "tree_id");

            migrationBuilder.CreateIndex(
                name: "ix_goals_domain_id",
                table: "goals",
                column: "domain_id");

            migrationBuilder.CreateIndex(
                name: "IX_habit_logs_habit_id_logged_date",
                table: "habit_logs",
                columns: new[] { "habit_id", "logged_date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_habits_domain_id",
                table: "habits",
                column: "domain_id");

            migrationBuilder.CreateIndex(
                name: "ix_habits_goal_id",
                table: "habits",
                column: "goal_id");

            migrationBuilder.CreateIndex(
                name: "ix_income_streams_finance_id",
                table: "income_streams",
                column: "finance_id");

            migrationBuilder.CreateIndex(
                name: "ix_jobs_phase_id",
                table: "jobs",
                column: "phase_id");

            migrationBuilder.CreateIndex(
                name: "ix_journal_entries_domain_id",
                table: "journal_entries",
                column: "domain_id");

            migrationBuilder.CreateIndex(
                name: "ix_mental_states_phase_id",
                table: "mental_states",
                column: "phase_id");

            migrationBuilder.CreateIndex(
                name: "ix_milestones_goal_id",
                table: "milestones",
                column: "goal_id");

            migrationBuilder.CreateIndex(
                name: "IX_platform_metrics_platform_id_snapshot_date",
                table: "platform_metrics",
                columns: new[] { "platform_id", "snapshot_date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_platforms_profile_id",
                table: "platforms",
                column: "profile_id");

            migrationBuilder.CreateIndex(
                name: "ix_skill_nodes_tree_id",
                table: "skill_nodes",
                column: "tree_id");

            migrationBuilder.CreateIndex(
                name: "ix_skill_trees_domain_id",
                table: "skill_trees",
                column: "domain_id");

            migrationBuilder.CreateIndex(
                name: "ix_skill_trees_profile_id",
                table: "skill_trees",
                column: "profile_id");

            migrationBuilder.CreateIndex(
                name: "ix_skills_job_id",
                table: "skills",
                column: "job_id");

            migrationBuilder.CreateIndex(
                name: "ix_turning_points_phase_id",
                table: "turning_points",
                column: "phase_id");

            migrationBuilder.CreateIndex(
                name: "ix_xp_logs_node_id",
                table: "xp_logs",
                column: "node_id");

            migrationBuilder.CreateIndex(
                name: "ix_xp_logs_platform_id",
                table: "xp_logs",
                column: "platform_id");

            migrationBuilder.CreateIndex(
                name: "ix_xp_logs_tree_id",
                table: "xp_logs",
                column: "tree_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "achievements");

            migrationBuilder.DropTable(
                name: "brand_archetypes");

            migrationBuilder.DropTable(
                name: "brand_stats");

            migrationBuilder.DropTable(
                name: "content_queue");

            migrationBuilder.DropTable(
                name: "habit_logs");

            migrationBuilder.DropTable(
                name: "income_streams");

            migrationBuilder.DropTable(
                name: "journal_entries");

            migrationBuilder.DropTable(
                name: "mental_states");

            migrationBuilder.DropTable(
                name: "milestones");

            migrationBuilder.DropTable(
                name: "platform_metrics");

            migrationBuilder.DropTable(
                name: "relationships");

            migrationBuilder.DropTable(
                name: "skills");

            migrationBuilder.DropTable(
                name: "turning_points");

            migrationBuilder.DropTable(
                name: "xp_logs");

            migrationBuilder.DropTable(
                name: "brand_pillars");

            migrationBuilder.DropTable(
                name: "habits");

            migrationBuilder.DropTable(
                name: "finances");

            migrationBuilder.DropTable(
                name: "jobs");

            migrationBuilder.DropTable(
                name: "platforms");

            migrationBuilder.DropTable(
                name: "skill_nodes");

            migrationBuilder.DropTable(
                name: "goals");

            migrationBuilder.DropTable(
                name: "life_phases");

            migrationBuilder.DropTable(
                name: "skill_trees");

            migrationBuilder.DropTable(
                name: "brand_profiles");

            migrationBuilder.DropTable(
                name: "life_domains");
        }
    }
}
