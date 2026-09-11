using Backend.Data;
using Backend.DTOs.Chat;
using Backend.Helpers;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public interface IChatService
{
    Task<List<ChatSessionResponse>> ListSessionsAsync(Guid userId, CancellationToken ct);
    Task<List<ChatSessionResponse>> SearchSessionsAsync(Guid userId, string query, CancellationToken ct);
    Task<ChatSessionDetailResponse> GetSessionAsync(Guid id, Guid userId, CancellationToken ct);
    Task<ChatSessionResponse> CreateSessionAsync(Guid userId, CreateChatSessionRequest request, CancellationToken ct);
    Task<ChatSessionResponse> RenameSessionAsync(Guid id, Guid userId, RenameChatSessionRequest request, CancellationToken ct);
    Task DeleteSessionAsync(Guid id, Guid userId, CancellationToken ct);
    Task<AskMessageResponse> AskAsync(Guid sessionId, Guid userId, AskMessageRequest request, CancellationToken ct);
}

/// <summary>Owns chat sessions/messages/sources end-to-end (spec sections 14-16). Every
/// question is checked against the Knowledge Base and the caller's monthly quota before
/// it reaches Python, and the full round trip (question, answer, sources) is persisted.</summary>
public class ChatService : IChatService
{
    private readonly AppDbContext _db;
    private readonly Authorization.IResourceAuthorizationService _auth;
    private readonly IPlanLimitService _limits;
    private readonly Integrations.PythonRag.IRagService _rag;
    private readonly IActivityLogService _activity;

    public ChatService(
        AppDbContext db, Authorization.IResourceAuthorizationService auth, IPlanLimitService limits,
        Integrations.PythonRag.IRagService rag, IActivityLogService activity)
    {
        _db = db;
        _auth = auth;
        _limits = limits;
        _rag = rag;
        _activity = activity;
    }

    public async Task<List<ChatSessionResponse>> ListSessionsAsync(Guid userId, CancellationToken ct) =>
        await SessionSummaries(userId).OrderByDescending(s => s.UpdatedAt).ToListAsync(ct);

    public async Task<List<ChatSessionResponse>> SearchSessionsAsync(Guid userId, string query, CancellationToken ct)
    {
        var q = query.Trim();
        return await SessionSummaries(userId)
            .Where(s => EF.Functions.ILike(s.Title, $"%{q}%"))
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync(ct);
    }

    public async Task<ChatSessionDetailResponse> GetSessionAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var session = await _db.ChatSessions
            .Include(s => s.KnowledgeBase)
            .Include(s => s.Messages).ThenInclude(m => m.Sources).ThenInclude(src => src.Document)
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct)
            ?? throw new NotFoundException("Conversation not found.");

        var messages = session.Messages.OrderBy(m => m.CreatedAt).Select(MapMessage).ToList();
        return new ChatSessionDetailResponse(
            MapSession(session, session.KnowledgeBase?.Name ?? "", session.Messages.Count), messages);
    }

    public async Task<ChatSessionResponse> CreateSessionAsync(Guid userId, CreateChatSessionRequest request, CancellationToken ct)
    {
        var kb = await _auth.GetKnowledgeBaseAsync(request.KnowledgeBaseId, userId, ct: ct);

        var session = new ChatSession
        {
            UserId = userId,
            KnowledgeBaseId = kb.Id,
            Title = string.IsNullOrWhiteSpace(request.Title) ? "New conversation" : request.Title.Trim(),
        };
        _db.ChatSessions.Add(session);
        await _db.SaveChangesAsync(ct);

        await _activity.LogAsync(userId, kb.WorkspaceId, ActivityAction.ChatStarted, "ChatSession", session.Id.ToString(), ct: ct);
        return MapSession(session, kb.Name, 0);
    }

    public async Task<ChatSessionResponse> RenameSessionAsync(Guid id, Guid userId, RenameChatSessionRequest request, CancellationToken ct)
    {
        var session = await _db.ChatSessions.Include(s => s.KnowledgeBase)
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct)
            ?? throw new NotFoundException("Conversation not found.");

        session.Title = request.Title.Trim();
        session.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        var count = await _db.ChatMessages.CountAsync(m => m.ChatSessionId == id, ct);
        return MapSession(session, session.KnowledgeBase?.Name ?? "", count);
    }

    public async Task DeleteSessionAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var session = await _db.ChatSessions.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct)
            ?? throw new NotFoundException("Conversation not found.");
        _db.ChatSessions.Remove(session); // cascades to messages/sources
        await _db.SaveChangesAsync(ct);
    }

    public async Task<AskMessageResponse> AskAsync(Guid sessionId, Guid userId, AskMessageRequest request, CancellationToken ct)
    {
        var session = await _db.ChatSessions.Include(s => s.KnowledgeBase)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, ct)
            ?? throw new NotFoundException("Conversation not found.");
        var kb = session.KnowledgeBase ?? throw new NotFoundException("Knowledge Base not found.");

        await _auth.GetKnowledgeBaseAsync(kb.Id, userId, ct: ct); // still a member? (could have been removed)
        await _limits.EnsureCanAskQuestionAsync(userId, ct);

        var isFirstMessage = !await _db.ChatMessages.AnyAsync(m => m.ChatSessionId == sessionId, ct);

        _db.ChatMessages.Add(new ChatMessage { ChatSessionId = sessionId, Role = ChatRole.User, Content = request.Question });
        await _db.SaveChangesAsync(ct);

        var settings = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == kb.OwnerId, ct);
        var result = await _rag.QueryAsync(
            kb.QdrantCollectionName, request.Question,
            request.TopK ?? settings?.TopK ?? 4, settings?.SimilarityThreshold, ct);

        var assistantMessage = new ChatMessage { ChatSessionId = sessionId, Role = ChatRole.Assistant, Content = result.Answer };
        _db.ChatMessages.Add(assistantMessage);

        var docIds = result.Sources
            .Where(s => Guid.TryParse(s.DocumentId, out _))
            .Select(s => Guid.Parse(s.DocumentId!)).Distinct().ToList();
        var docNames = await _db.Documents.Where(d => docIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.FileName, ct);

        var sources = result.Sources.Select(s =>
        {
            Guid? docId = Guid.TryParse(s.DocumentId, out var g) ? g : null;
            return new ChatSource
            {
                MessageId = assistantMessage.Id,
                DocumentId = docId,
                PageNumber = s.Page,
                ChunkId = s.ChunkId,
                RelevanceScore = s.Score,
                Excerpt = s.Excerpt,
            };
        }).ToList();
        _db.ChatSources.AddRange(sources);

        if (isFirstMessage)
            session.Title = request.Question.Length > 60 ? request.Question[..60] + "…" : request.Question;
        session.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);
        await _limits.RecordQuestionAskedAsync(userId, ct);
        await _activity.LogAsync(userId, kb.WorkspaceId, ActivityAction.QuestionAsked, "ChatSession", sessionId.ToString(), ct: ct);

        return new AskMessageResponse(
            sessionId, assistantMessage.Id, result.Answer,
            sources.Select(s => new ChatSourceResponse(
                s.DocumentId, s.DocumentId.HasValue && docNames.TryGetValue(s.DocumentId.Value, out var n) ? n : null,
                s.PageNumber, s.RelevanceScore, s.Excerpt)).ToList());
    }

    private IQueryable<ChatSessionResponse> SessionSummaries(Guid userId) =>
        _db.ChatSessions.Where(s => s.UserId == userId)
            .Select(s => new ChatSessionResponse(
                s.Id, s.KnowledgeBaseId, s.KnowledgeBase!.Name, s.Title, s.Messages.Count, s.CreatedAt, s.UpdatedAt));

    private static ChatSessionResponse MapSession(ChatSession s, string kbName, int count) => new(
        s.Id, s.KnowledgeBaseId, kbName, s.Title, count, s.CreatedAt, s.UpdatedAt);

    private static ChatMessageResponse MapMessage(ChatMessage m) => new(
        m.Id, m.Role.ToString(), m.Content, m.CreatedAt,
        m.Sources.Select(s => new ChatSourceResponse(
            s.DocumentId, s.Document?.FileName, s.PageNumber, s.RelevanceScore, s.Excerpt)).ToList());
}
