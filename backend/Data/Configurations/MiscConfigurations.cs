using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public class ActivityLogConfiguration : IEntityTypeConfiguration<ActivityLog>
{
    public void Configure(EntityTypeBuilder<ActivityLog> b)
    {
        b.ToTable("activity_logs");
        b.HasKey(x => x.Id);
        b.Property(x => x.Action).IsRequired().HasMaxLength(50);
        b.Property(x => x.EntityType).HasMaxLength(50);
        b.Property(x => x.MetadataJson).HasColumnType("jsonb").HasColumnName("metadata");
        b.HasIndex(x => x.UserId);
        b.HasIndex(x => x.WorkspaceId);
        b.HasIndex(x => x.CreatedAt);

        b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Workspace).WithMany().HasForeignKey(x => x.WorkspaceId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> b)
    {
        b.ToTable("notifications");
        b.HasKey(x => x.Id);
        b.Property(x => x.Type).HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.Title).HasMaxLength(200);
        b.HasIndex(x => x.UserId);
        b.HasIndex(x => x.CreatedAt);

        b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class UserSettingsConfiguration : IEntityTypeConfiguration<UserSettings>
{
    public void Configure(EntityTypeBuilder<UserSettings> b)
    {
        b.ToTable("user_settings");
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.UserId).IsUnique();

        b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class ApiKeyConfiguration : IEntityTypeConfiguration<ApiKey>
{
    public void Configure(EntityTypeBuilder<ApiKey> b)
    {
        b.ToTable("api_keys");
        b.HasKey(x => x.Id);
        b.Property(x => x.KeyHash).IsRequired().HasMaxLength(128);
        b.HasIndex(x => x.KeyHash).IsUnique();
        b.HasIndex(x => x.UserId);

        b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class AdminAuditLogConfiguration : IEntityTypeConfiguration<AdminAuditLog>
{
    public void Configure(EntityTypeBuilder<AdminAuditLog> b)
    {
        b.ToTable("admin_audit_logs");
        b.HasKey(x => x.Id);
        b.Property(x => x.ActorEmail).HasMaxLength(320);
        b.Property(x => x.Action).IsRequired().HasMaxLength(60);
        b.Property(x => x.ResourceType).HasMaxLength(50);
        b.Property(x => x.ResourceId).HasMaxLength(64);
        b.Property(x => x.Result).HasMaxLength(20);
        b.Property(x => x.Details).HasMaxLength(500);
        b.Property(x => x.IpAddress).HasMaxLength(64);
        b.HasIndex(x => x.CreatedAt);
        b.HasIndex(x => x.ActorId);
    }
}
