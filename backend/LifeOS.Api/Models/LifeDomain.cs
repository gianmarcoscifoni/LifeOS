namespace LifeOS.Api.Models;

public class LifeDomain
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public string Status { get; set; } = "active";
    public int Priority { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Goal> Goals { get; set; } = new List<Goal>();
    public ICollection<Habit> Habits { get; set; } = new List<Habit>();
    public ICollection<JournalEntry> JournalEntries { get; set; } = new List<JournalEntry>();
    public ICollection<SkillTree> SkillTrees { get; set; } = new List<SkillTree>();
}
