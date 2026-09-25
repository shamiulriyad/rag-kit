using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public class SupportTicketConfiguration : IEntityTypeConfiguration<SupportTicket>
{
    public void Configure(EntityTypeBuilder<SupportTicket> b)
    {
        b.ToTable("support_tickets");
        b.HasKey(x => x.Id);
        b.Property(x => x.Subject).IsRequired().HasMaxLength(150);
        b.Property(x => x.Status).IsRequired().HasMaxLength(20);
        b.HasIndex(x => x.UserId);
        b.HasIndex(x => new { x.Status, x.UpdatedAt });
        b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Messages).WithOne().HasForeignKey(m => m.TicketId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class SupportMessageConfiguration : IEntityTypeConfiguration<SupportMessage>
{
    public void Configure(EntityTypeBuilder<SupportMessage> b)
    {
        b.ToTable("support_messages");
        b.HasKey(x => x.Id);
        b.Property(x => x.AuthorEmail).HasMaxLength(320);
        b.Property(x => x.Body).IsRequired().HasMaxLength(4000);
        b.HasIndex(x => new { x.TicketId, x.CreatedAt });
    }
}
