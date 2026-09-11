using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public class ChatSessionConfiguration : IEntityTypeConfiguration<ChatSession>
{
    public void Configure(EntityTypeBuilder<ChatSession> b)
    {
        b.ToTable("chat_sessions");
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(300);
        b.HasIndex(x => x.UserId);
        b.HasIndex(x => x.KnowledgeBaseId);
        b.HasIndex(x => x.UpdatedAt);

        b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.KnowledgeBase).WithMany().HasForeignKey(x => x.KnowledgeBaseId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> b)
    {
        b.ToTable("chat_messages");
        b.HasKey(x => x.Id);
        b.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Content).IsRequired();
        b.HasIndex(x => x.ChatSessionId);

        b.HasOne(x => x.ChatSession).WithMany(s => s.Messages).HasForeignKey(x => x.ChatSessionId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class ChatSourceConfiguration : IEntityTypeConfiguration<ChatSource>
{
    public void Configure(EntityTypeBuilder<ChatSource> b)
    {
        b.ToTable("chat_sources");
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.MessageId);
        b.HasIndex(x => x.DocumentId);

        b.HasOne(x => x.Message).WithMany(m => m.Sources).HasForeignKey(x => x.MessageId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Document).WithMany().HasForeignKey(x => x.DocumentId).OnDelete(DeleteBehavior.SetNull);
    }
}
