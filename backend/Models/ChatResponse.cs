namespace Backend.Models;

/// <summary>What <c>POST /api/chat</c> returns to React.</summary>
public class ChatResponse
{
    /// <summary>The generated answer, grounded in the retrieved chunks.</summary>
    public string Answer { get; set; } = string.Empty;

    /// <summary>The chunks the answer was built from.</summary>
    public List<Source> Sources { get; set; } = new();
}
