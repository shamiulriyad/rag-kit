namespace Backend.Models;

/// <summary>A customer's request for help. A conversation between the customer and platform staff.</summary>
public class SupportTicket
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string Subject { get; set; } = string.Empty;

    /// <summary>"open" (waiting on staff) | "answered" (waiting on the customer) | "closed".</summary>
    public string Status { get; set; } = "open";

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<SupportMessage> Messages { get; set; } = [];
}

public class SupportMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TicketId { get; set; }

    public Guid AuthorId { get; set; }
    public string AuthorEmail { get; set; } = string.Empty;

    /// <summary>True when written by platform staff from the admin panel.</summary>
    public bool IsStaff { get; set; }

    /// <summary>Plain text only; always rendered as text, never as markup.</summary>
    public string Body { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
