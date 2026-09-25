using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public class SecurityEventConfiguration : IEntityTypeConfiguration<SecurityEvent>
{
    public void Configure(EntityTypeBuilder<SecurityEvent> b)
    {
        b.ToTable("security_events");
        b.HasKey(x => x.Id);
        b.Property(x => x.Type).IsRequired().HasMaxLength(30);
        b.Property(x => x.Email).HasMaxLength(320);
        b.Property(x => x.IpAddress).HasMaxLength(64);
        b.Property(x => x.Path).HasMaxLength(200);
        b.Property(x => x.Details).HasMaxLength(300);
        b.HasIndex(x => x.CreatedAt);
        b.HasIndex(x => x.Type);
    }
}
