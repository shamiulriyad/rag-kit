namespace Backend.Models;

/// <summary>What React sends to <c>POST /api/chat</c>.</summary>
public class ChatRequest
{
    /// <summary>The user's question.</summary>
    public string Question { get; set; } = string.Empty;

    /// <summary>Optional: how many chunks to retrieve. Null = use the RAG service default.</summary>
    public int? TopK { get; set; }
}
