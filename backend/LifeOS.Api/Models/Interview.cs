namespace LifeOS.Api.Models;

public class Interview
{
    public Guid Id         { get; set; } = Guid.NewGuid();
    public string Company  { get; set; } = string.Empty;
    public string Role     { get; set; } = string.Empty;
    public DateOnly Date   { get; set; }
    // scheduled | done | rejected | offer | ghosted
    public string Status   { get; set; } = "scheduled";
    public string? Notes   { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<InterviewQA> QaPairs { get; set; } = [];
}
