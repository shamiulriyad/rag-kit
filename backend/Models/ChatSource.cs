namespace Backend.Models;

/// <summary>One retrieved chunk an assistant message cited. Populated from the
/// Python RAG service's response, never generated client-side.</summary>
public class ChatSource
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid MessageId { get; set; }
    public ChatMessage? Message { get; set; }

    public Guid? DocumentId { get; set; }
    public Document? Document { get; set; }

    public int? PageNumber { get; set; }
    public string? ChunkId { get; set; }
    public double RelevanceScore { get; set; }
    public string Excerpt { get; set; } = string.Empty;
}
