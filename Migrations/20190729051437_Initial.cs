using Microsoft.EntityFrameworkCore.Migrations;

namespace CryptoBotUI.Migrations
{
    public partial class Initial : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DirectoryNodes",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ParentId = table.Column<int>(nullable: true),
                    Locked = table.Column<bool>(nullable: false),
                    Name = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DirectoryNodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DirectoryNodes_DirectoryNodes_ParentId",
                        column: x => x.ParentId,
                        principalTable: "DirectoryNodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FileNodes",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ParentId = table.Column<int>(nullable: true),
                    Locked = table.Column<bool>(nullable: false),
                    Name = table.Column<string>(nullable: true),
                    Content = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FileNodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FileNodes_DirectoryNodes_ParentId",
                        column: x => x.ParentId,
                        principalTable: "DirectoryNodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Problems",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    FileNodeId = table.Column<int>(nullable: true),
                    Message = table.Column<string>(nullable: true),
                    StartLineNumber = table.Column<int>(nullable: false),
                    StartColumn = table.Column<int>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Problems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Problems_FileNodes_FileNodeId",
                        column: x => x.FileNodeId,
                        principalTable: "FileNodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "DirectoryNodes",
                columns: new[] { "Id", "Locked", "Name", "ParentId" },
                values: new object[] { -2, true, "Strategies", null });

            migrationBuilder.InsertData(
                table: "DirectoryNodes",
                columns: new[] { "Id", "Locked", "Name", "ParentId" },
                values: new object[] { -1, true, "Modules", null });

            migrationBuilder.InsertData(
                table: "DirectoryNodes",
                columns: new[] { "Id", "Locked", "Name", "ParentId" },
                values: new object[] { -5, true, "Pair Selectors", -1 });

            migrationBuilder.InsertData(
                table: "DirectoryNodes",
                columns: new[] { "Id", "Locked", "Name", "ParentId" },
                values: new object[] { -4, true, "Signal Emitters", -1 });

            migrationBuilder.InsertData(
                table: "DirectoryNodes",
                columns: new[] { "Id", "Locked", "Name", "ParentId" },
                values: new object[] { -3, true, "Order Managers", -1 });

            migrationBuilder.CreateIndex(
                name: "IX_DirectoryNodes_Name",
                table: "DirectoryNodes",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DirectoryNodes_ParentId",
                table: "DirectoryNodes",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_FileNodes_Name",
                table: "FileNodes",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FileNodes_ParentId",
                table: "FileNodes",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Problems_FileNodeId",
                table: "Problems",
                column: "FileNodeId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Problems");

            migrationBuilder.DropTable(
                name: "FileNodes");

            migrationBuilder.DropTable(
                name: "DirectoryNodes");
        }
    }
}
