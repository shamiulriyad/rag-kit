namespace Backend.Models;

/// <summary>A user's AI knowledge workspace - the unit documents are uploaded into and
/// chat is scoped to. Maps 1:1 to a Qdrant collection (see Integrations/PythonRag).</summary>
public class KnowledgeBase
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public Guid OwnerId { get; set; }
    public User? Owner { get; set; }

    public Guid? WorkspaceId { get; set; }
    public Workspace? Workspace { get; set; }

    /// <summary>Denormalized counters, kept in sync as documents are added/removed/processed
    /// so the dashboard/list views don't need an aggregate query on every request.</summary>
    public int DocumentCount { get; set; }
    public int ChunkCount { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<KnowledgeBaseMember> Members { get; set; } = new List<KnowledgeBaseMember>();
    public ICollection<Document> Documents { get; set; } = new List<Document>();

    /// <summary>The Qdrant collection name this Knowledge Base's vectors live in.
    /// Deterministic from Id (see Integrations/PythonRag/RagCollectionNaming.cs) so it
    /// never needs to be stored, but exposed here as a convenience.</summary>
    public string QdrantCollectionName => $"kb_{Id:N}";
}
