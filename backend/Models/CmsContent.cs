namespace Backend.Models;

/// <summary>A piece of website content managed from the admin panel. Body is plain text (blank
/// line = new paragraph): the CMS stores no HTML, so published content can never carry script.</summary>
public class CmsContent
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>homepage | feature | usecase | faq | blog | docs | announcement | pricing.</summary>
    public string Type { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    /// <summary>"draft" | "published".</summary>
    public string Status { get; set; } = "draft";
    public int Version { get; set; } = 1;

    public string AuthorEmail { get; set; } = string.Empty;
    public string UpdatedByEmail { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? PublishedAt { get; set; }

    public List<CmsContentVersion> Versions { get; set; } = [];
}

/// <summary>Immutable snapshot taken on every save, so any earlier version can be restored.</summary>
public class CmsContentVersion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ContentId { get; set; }
    public int Version { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string EditedByEmail { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
