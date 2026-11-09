using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.Infrastructure.Persistence.Configurations;

internal sealed class SeatHoldConfiguration : IEntityTypeConfiguration<SeatHold>
{
    public void Configure(EntityTypeBuilder<SeatHold> builder)
    {
        builder.ToTable("holds", table =>
        {
            table.HasCheckConstraint("ck_holds_student_id", "student_id ~ '^[0-9]{17}$'");
            table.HasCheckConstraint("ck_holds_status", "status IN ('HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED')");
            table.HasCheckConstraint("ck_holds_expiry", "expires_at > created_at");
        });
        builder.HasKey(entity => entity.Id).HasName("pk_holds");
        builder.Property(entity => entity.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(entity => entity.ClassId).HasColumnName("class_id");
        builder.Property(entity => entity.StudentId).HasColumnName("student_id").HasMaxLength(17)
            .HasConversion(identifier => identifier.Value, value => StudentId.Parse(value));
        builder.Property(entity => entity.Status).HasColumnName("status").HasMaxLength(9)
            .HasConversion(status => status.ToString().ToUpperInvariant(), value => Enum.Parse<HoldStatus>(value, true));
        builder.Property(entity => entity.CreatedAt).HasColumnName("created_at");
        builder.Property(entity => entity.ExpiresAt).HasColumnName("expires_at");
        builder.HasOne<AdmissionClass>().WithMany().HasForeignKey(entity => entity.ClassId)
            .OnDelete(DeleteBehavior.Restrict).HasConstraintName("fk_holds_classes");
        builder.HasIndex(entity => new { entity.ClassId, entity.StudentId }).IsUnique()
            .HasFilter("status IN ('HELD', 'CONFIRMED')").HasDatabaseName("ux_holds_active_student_class");
        builder.HasIndex(entity => new { entity.ClassId, entity.Status, entity.ExpiresAt })
            .HasDatabaseName("ix_holds_class_status_expiry");
        builder.HasIndex(entity => new { entity.StudentId, entity.CreatedAt }).IsDescending(false, true)
            .HasDatabaseName("ix_holds_student_created_at");
        builder.HasIndex(entity => entity.ExpiresAt).HasFilter("status = 'HELD'")
            .HasDatabaseName("ix_holds_pending_expiry");
    }
}
