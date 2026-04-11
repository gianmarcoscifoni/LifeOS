namespace LifeOS.Api.Models;

public class JournalEntry
{
    public Guid Id { get; set; }
    public Guid? DomainId { get; set; }
    public DateOnly EntryDate { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? Mood { get; set; }
    public string[] Tags { get; set; } = Array.Empty<string>();
    public string Source { get; set; } = "manual";
    public DateTime CreatedAt { get; set; }

    public LifeDomain? Domain { get; set; }
}
