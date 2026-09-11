using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.Chat;

/// <summary>Shaped to match frontend/src/lib/appData.ts's <c>Conversation</c> interface
/// (id, title, knowledgeBase, messages, updatedAt).</summary>
public record ChatSessionResponse(
    Guid Id, Guid KnowledgeBaseId, string KnowledgeBaseName,
    string Title, int MessageCount,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

public record ChatSourceResponse(
    Guid? DocumentId, string? DocumentName, int? Page, double RelevanceScore, string Excerpt);

public record ChatMessageResponse(
    Guid Id, string Role, string Content, DateTimeOffset CreatedAt, List<ChatSourceResponse> Sources);

public record ChatSessionDetailResponse(ChatSessionResponse Session, List<ChatMessageResponse> Messages);

public record CreateChatSessionRequest(
    [property: Required] Guid KnowledgeBaseId,
    string? Title);

public record RenameChatSessionRequest([property: Required, MinLength(1), MaxLength(300)] string Title);

public record AskMessageRequest(
    [property: Required, MinLength(1)] string Question,
    int? TopK);

/// <summary>Matches the exact shape given in the spec's Chat API section: an answer plus
/// sources carrying documentId/documentName/page/relevanceScore/excerpt.</summary>
public record AskMessageResponse(
    Guid SessionId, Guid MessageId, string Answer, List<ChatSourceResponse> Sources);
