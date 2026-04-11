namespace LifeOS.Api.Models;

public class Relationship
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? RoleInStory { get; set; }
    public string? CurrentStatus { get; set; }
    public DateTime CreatedAt { get; set; }
}
