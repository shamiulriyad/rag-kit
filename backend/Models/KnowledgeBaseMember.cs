namespace Backend.Models;

public class KnowledgeBaseMember
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid KnowledgeBaseId { get; set; }
    public KnowledgeBase? KnowledgeBase { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public MemberRole Role { get; set; } = MemberRole.Member;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
