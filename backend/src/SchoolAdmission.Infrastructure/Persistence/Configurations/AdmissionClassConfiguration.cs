using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SchoolAdmission.Domain.Admissions;

namespace SchoolAdmission.Infrastructure.Persistence.Configurations;

internal sealed class AdmissionClassConfiguration : IEntityTypeConfiguration<AdmissionClass>
{
    public void Configure(EntityTypeBuilder<AdmissionClass> builder)
    {
        builder.ToTable("classes", table =>
        {
            table.HasCheckConstraint("ck_classes_positive_seats", "total_seats > 0");
            table.HasCheckConstraint("ck_classes_nonempty_name", "length(btrim(name)) > 0");
        });
        builder.HasKey(entity => entity.Id).HasName("pk_classes");
        builder.Property(entity => entity.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(entity => entity.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        builder.Property(entity => entity.TotalSeats).HasColumnName("total_seats");
        builder.Property(entity => entity.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(entity => entity.CreatedAt).HasDatabaseName("ix_classes_created_at");
    }
}
