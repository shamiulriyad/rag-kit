namespace Backend.Models;

public class ChatMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ChatSessionId { get; set; }
    public ChatSession? ChatSession { get; set; }

    public ChatRole Role { get; set; }
    public string Content { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<ChatSource> Sources { get; set; } = new List<ChatSource>();
}
