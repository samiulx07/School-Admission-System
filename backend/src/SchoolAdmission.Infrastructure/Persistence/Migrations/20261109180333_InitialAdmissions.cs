using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolAdmission.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class InitialAdmissions : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.EnsureSchema(
            name: "admissions");

        migrationBuilder.CreateTable(
            name: "classes",
            schema: "admissions",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                total_seats = table.Column<int>(type: "integer", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_classes", x => x.id);
                table.CheckConstraint("ck_classes_nonempty_name", "length(btrim(name)) > 0");
                table.CheckConstraint("ck_classes_positive_seats", "total_seats > 0");
            });

        migrationBuilder.CreateTable(
            name: "holds",
            schema: "admissions",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                class_id = table.Column<Guid>(type: "uuid", nullable: false),
                student_id = table.Column<string>(type: "character varying(17)", maxLength: 17, nullable: false),
                status = table.Column<string>(type: "character varying(9)", maxLength: 9, nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_holds", x => x.id);
                table.CheckConstraint("ck_holds_expiry", "expires_at > created_at");
                table.CheckConstraint("ck_holds_status", "status IN ('HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED')");
                table.CheckConstraint("ck_holds_student_id", "student_id ~ '^[0-9]{17}$'");
                table.ForeignKey(
                    name: "fk_holds_classes",
                    column: x => x.class_id,
                    principalSchema: "admissions",
                    principalTable: "classes",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ix_classes_created_at",
            schema: "admissions",
            table: "classes",
            column: "created_at");

        migrationBuilder.CreateIndex(
            name: "ix_holds_class_status_expiry",
            schema: "admissions",
            table: "holds",
            columns: new[] { "class_id", "status", "expires_at" });

        migrationBuilder.CreateIndex(
            name: "ix_holds_pending_expiry",
            schema: "admissions",
            table: "holds",
            column: "expires_at",
            filter: "status = 'HELD'");

        migrationBuilder.CreateIndex(
            name: "ix_holds_student_created_at",
            schema: "admissions",
            table: "holds",
            columns: new[] { "student_id", "created_at" },
            descending: new[] { false, true });

        migrationBuilder.CreateIndex(
            name: "ux_holds_active_student_class",
            schema: "admissions",
            table: "holds",
            columns: new[] { "class_id", "student_id" },
            unique: true,
            filter: "status IN ('HELD', 'CONFIRMED')");

        // Supabase's API roles must not inherit access to this private EF-managed schema.
        // Conditional role checks also keep this migration portable to ordinary PostgreSQL.
        migrationBuilder.Sql("""
            REVOKE ALL ON SCHEMA admissions FROM PUBLIC;
            REVOKE ALL ON ALL TABLES IN SCHEMA admissions FROM PUBLIC;
            DO $private_schema$
            DECLARE api_role text;
            BEGIN
                FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
                        EXECUTE format('REVOKE ALL ON SCHEMA admissions FROM %I', api_role);
                        EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA admissions FROM %I', api_role);
                    END IF;
                END LOOP;
            END;
            $private_schema$;
            """);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "holds",
            schema: "admissions");

        migrationBuilder.DropTable(
            name: "classes",
            schema: "admissions");
    }
}
