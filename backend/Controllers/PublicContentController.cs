using Backend.Data;
using Backend.DTOs.Common;
using Backend.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

public record PublicContentItem(string Type, string Slug, string Title, string Summary, string Body, DateTimeOffset PublishedAt);

/// <summary>The public site's read-only view of CMS content: published items only, never drafts, and no
/// author, version or audit information. Content is plain text (the CMS rejects markup on save).</summary>
[Route("api/public/content")]
[Tags("Public content")]
[AllowAnonymous]
public class PublicContentController(AppDbContext db) : ApiControllerBase
{
    [HttpGet]
    [ResponseCache(Duration = 60)]
    public async Task<ActionResult> List([FromQuery] string type, CancellationToken ct)
    {
        type = (type ?? "").Trim().ToLowerInvariant();
        if (!AdminCmsService.Types.Contains(type)) return Success(new List<PublicContentItem>());

        var items = await db.CmsContents
            .Where(c => c.Type == type && c.Status == "published")
            .OrderByDescending(c => c.PublishedAt)
            .Take(100)
            .Select(c => new PublicContentItem(c.Type, c.Slug, c.Title, c.Summary, c.Body, c.PublishedAt ?? c.UpdatedAt))
            .ToListAsync(ct);
        return Success(items);
    }
}
