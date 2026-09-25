using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public class CmsContentConfiguration : IEntityTypeConfiguration<CmsContent>
{
    public void Configure(EntityTypeBuilder<CmsContent> b)
    {
        b.ToTable("cms_contents");
        b.HasKey(x => x.Id);
        b.Property(x => x.Type).IsRequired().HasMaxLength(30);
        b.Property(x => x.Slug).IsRequired().HasMaxLength(120);
        b.Property(x => x.Title).IsRequired().HasMaxLength(200);
        b.Property(x => x.Summary).HasMaxLength(500);
        b.Property(x => x.Body).HasMaxLength(20000);
        b.Property(x => x.Status).HasMaxLength(20);
        b.Property(x => x.AuthorEmail).HasMaxLength(320);
        b.Property(x => x.UpdatedByEmail).HasMaxLength(320);
        b.HasIndex(x => new { x.Type, x.Slug }).IsUnique();
        b.HasIndex(x => x.UpdatedAt);
        b.HasMany(x => x.Versions).WithOne().HasForeignKey(v => v.ContentId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class CmsContentVersionConfiguration : IEntityTypeConfiguration<CmsContentVersion>
{
    public void Configure(EntityTypeBuilder<CmsContentVersion> b)
    {
        b.ToTable("cms_content_versions");
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(200);
        b.Property(x => x.Summary).HasMaxLength(500);
        b.Property(x => x.Body).HasMaxLength(20000);
        b.Property(x => x.EditedByEmail).HasMaxLength(320);
        b.HasIndex(x => new { x.ContentId, x.Version }).IsUnique();
    }
}
