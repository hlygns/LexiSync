using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LexiSync.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ReviewLogs_ServerVersion",
                table: "ReviewLogs");

            migrationBuilder.DropIndex(
                name: "IX_Decks_ServerVersion",
                table: "Decks");

            migrationBuilder.DropIndex(
                name: "IX_Decks_UserId",
                table: "Decks");

            migrationBuilder.DropIndex(
                name: "IX_Cards_ServerVersion",
                table: "Cards");

            migrationBuilder.CreateSequence(
                name: "server_version_seq");

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "ReviewLogs",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Cards",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "ProcessedChanges",
                columns: table => new
                {
                    ChangeId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProcessedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcessedChanges", x => x.ChangeId);
                    table.ForeignKey(
                        name: "FK_ProcessedChanges_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReviewLogs_UserId_ServerVersion",
                table: "ReviewLogs",
                columns: new[] { "UserId", "ServerVersion" });

            migrationBuilder.CreateIndex(
                name: "IX_Decks_UserId_ServerVersion",
                table: "Decks",
                columns: new[] { "UserId", "ServerVersion" });

            migrationBuilder.CreateIndex(
                name: "IX_Cards_UserId_ServerVersion",
                table: "Cards",
                columns: new[] { "UserId", "ServerVersion" });

            migrationBuilder.CreateIndex(
                name: "IX_ProcessedChanges_UserId",
                table: "ProcessedChanges",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Cards_Users_UserId",
                table: "Cards",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ReviewLogs_Users_UserId",
                table: "ReviewLogs",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cards_Users_UserId",
                table: "Cards");

            migrationBuilder.DropForeignKey(
                name: "FK_ReviewLogs_Users_UserId",
                table: "ReviewLogs");

            migrationBuilder.DropTable(
                name: "ProcessedChanges");

            migrationBuilder.DropIndex(
                name: "IX_ReviewLogs_UserId_ServerVersion",
                table: "ReviewLogs");

            migrationBuilder.DropIndex(
                name: "IX_Decks_UserId_ServerVersion",
                table: "Decks");

            migrationBuilder.DropIndex(
                name: "IX_Cards_UserId_ServerVersion",
                table: "Cards");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "ReviewLogs");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Cards");

            migrationBuilder.DropSequence(
                name: "server_version_seq");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewLogs_ServerVersion",
                table: "ReviewLogs",
                column: "ServerVersion");

            migrationBuilder.CreateIndex(
                name: "IX_Decks_ServerVersion",
                table: "Decks",
                column: "ServerVersion");

            migrationBuilder.CreateIndex(
                name: "IX_Decks_UserId",
                table: "Decks",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Cards_ServerVersion",
                table: "Cards",
                column: "ServerVersion");
        }
    }
}
