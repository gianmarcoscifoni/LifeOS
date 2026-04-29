namespace LifeOS.Api.Models;

public class ContextMemory
{
    public Guid     Id         { get; set; } = Guid.NewGuid();
    public string   Category   { get; set; } = string.Empty; // brand|habits|career|finance|journal|streak|goal|content
    public string   Fact       { get; set; } = string.Empty; // raw short sentence, e.g. "Reached 30-day streak on 2026-04-29"
    public int      Importance { get; set; } = 3;            // 1-5, used to prioritise which facts make the prompt
    public DateTime CreatedAt  { get; set; } = DateTime.UtcNow;
}
