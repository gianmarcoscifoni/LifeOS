namespace LifeOS.Api.Models;

public class InterviewQA
{
    public Guid Id            { get; set; } = Guid.NewGuid();
    public Guid InterviewId   { get; set; }
    public string Question    { get; set; } = string.Empty;
    public string Answer      { get; set; } = string.Empty;
    public string? Topic      { get; set; }
    // 1-5 AI quality rating of the answer
    public int? QualityScore  { get; set; }
    public string? AiFeedback { get; set; }
    public int SortOrder      { get; set; }

    public Interview Interview { get; set; } = null!;
}
