using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.Support;

public record SupportMessageResponse(Guid Id, string Author, bool IsStaff, string Body, DateTimeOffset CreatedAt);

public record SupportTicketItem(
    Guid Id, string Subject, string Status, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt, int Messages);

public record SupportTicketDetail(
    Guid Id, string Subject, string Status, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt,
    List<SupportMessageResponse> Messages);

public class CreateTicketRequest
{
    [Required, MaxLength(150)] public string Subject { get; set; } = string.Empty;
    [Required, MaxLength(4000)] public string Message { get; set; } = string.Empty;
}

public class TicketMessageRequest
{
    [Required, MaxLength(4000)] public string Body { get; set; } = string.Empty;
}

// ---- Admin view ---------------------------------------------------------------------------
public record AdminTicketItem(
    Guid Id, string Subject, string Status, Guid UserId, string UserEmail, int Messages,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

public record AdminTicketDetail(
    Guid Id, string Subject, string Status, Guid UserId, string UserEmail, string UserPlan,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt, List<SupportMessageResponse> Messages);

public class AdminTicketStatusRequest
{
    [Required] public string Status { get; set; } = string.Empty;
}
