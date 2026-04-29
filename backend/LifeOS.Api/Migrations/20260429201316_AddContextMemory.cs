using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddContextMemory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "context_memories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    category = table.Column<string>(type: "text", nullable: false),
                    fact = table.Column<string>(type: "text", nullable: false),
                    importance = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_context_memories", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "context_memories");
        }
    }
}
