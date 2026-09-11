using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public class KnowledgeBaseConfiguration : IEntityTypeConfiguration<KnowledgeBase>
{
    public void Configure(EntityTypeBuilder<KnowledgeBase> b)
    {
        b.ToTable("knowledge_bases");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).IsRequired().HasMaxLength(200);
        b.Ignore(x => x.QdrantCollectionName);
        b.HasIndex(x => x.OwnerId);
        b.HasIndex(x => x.WorkspaceId);
        b.HasIndex(x => x.CreatedAt);

        b.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Workspace).WithMany().HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class KnowledgeBaseMemberConfiguration : IEntityTypeConfiguration<KnowledgeBaseMember>
{
    public void Configure(EntityTypeBuilder<KnowledgeBaseMember> b)
    {
        b.ToTable("knowledge_base_members");
        b.HasKey(x => x.Id);
        b.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);
        b.HasIndex(x => new { x.KnowledgeBaseId, x.UserId }).IsUnique();

        b.HasOne(x => x.KnowledgeBase).WithMany(k => k.Members).HasForeignKey(x => x.KnowledgeBaseId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class DocumentConfiguration : IEntityTypeConfiguration<Document>
{
    public void Configure(EntityTypeBuilder<Document> b)
    {
        b.ToTable("documents");
        b.HasKey(x => x.Id);
        b.Property(x => x.FileName).IsRequired().HasMaxLength(500);
        b.Property(x => x.StoragePath).IsRequired().HasMaxLength(1000);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        b.HasIndex(x => x.KnowledgeBaseId);
        b.HasIndex(x => x.CreatedAt);

        b.HasOne(x => x.KnowledgeBase).WithMany(k => k.Documents).HasForeignKey(x => x.KnowledgeBaseId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.UploadedByUser).WithMany().HasForeignKey(x => x.UploadedBy).OnDelete(DeleteBehavior.Restrict);
    }
}
