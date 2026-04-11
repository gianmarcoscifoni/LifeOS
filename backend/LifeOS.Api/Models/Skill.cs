namespace LifeOS.Api.Models;

public class Skill
{
    public Guid Id { get; set; }
    public Guid? JobId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Level { get; set; }
    public bool Certified { get; set; }
    public string? CertName { get; set; }
    public DateOnly? CertDate { get; set; }
    public DateTime CreatedAt { get; set; }

    public Job? Job { get; set; }
}
