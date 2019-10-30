using System.Collections.Generic;
using JetBrains.Annotations;
using Microsoft.EntityFrameworkCore;

namespace CryptoBotUI.Models
{
    public class StrategyContext : DbContext
    {
        public StrategyContext(DbContextOptions options) : base(options) {}

        public DbSet<DirectoryNodeModel> DirectoryNodes { get; set; }
        public DbSet<FileNodeModel>      FileNodes      { get; set; }
        public DbSet<ProblemModel>       Problems       { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<DirectoryNodeModel>()
                .HasKey(directory => directory.Id);

            modelBuilder.Entity<DirectoryNodeModel>()
                .HasIndex(directory => directory.Name)
                .IsUnique();

            modelBuilder.Entity<FileNodeModel>()
                .HasKey(file => file.Id);

            modelBuilder.Entity<FileNodeModel>()
                .HasIndex(file => file.Name)
                .IsUnique();

            modelBuilder.Entity<DirectoryNodeModel>()
                .HasMany(directory => directory.Directories)
                .WithOne(directory => directory.Parent)
                .HasForeignKey(directory => directory.ParentId)
                .IsRequired(false);

            modelBuilder.Entity<DirectoryNodeModel>()
                .HasMany(directory => directory.Files)
                .WithOne(file => file.Parent)
                .HasForeignKey(file => file.ParentId)
                .IsRequired(false);

            modelBuilder.Entity<ProblemModel>()
                .HasKey(p => p.Id);

            modelBuilder.Entity<FileNodeModel>()
                .HasMany(file => file.Problems)
                .WithOne(problem => problem.FileNode)
                .HasForeignKey(problem => problem.FileNodeId)
                .IsRequired(false);

            var strategiesDirectory = new DirectoryNodeModel()
            {
                Id     = -2,
                Name   = "Strategies",
                Locked = true
            };

            var modulesDirectory = new DirectoryNodeModel()
            {
                Id     = -1,
                Name   = "Modules",
                Locked = true
            };

            var pairSelectorsDirectory = new DirectoryNodeModel()
            {
                Id       = -5,
                ParentId = -1,
                Name     = "Pair Selectors",
                Locked   = true
            };

            var signalEmittersDirectory = new DirectoryNodeModel()
            {
                Id       = -4,
                ParentId = -1,
                Name     = "Signal Emitters",
                Locked   = true
            };

            var orderManagersDirectory = new DirectoryNodeModel()
            {
                Id       = -3,
                ParentId = -1,
                Name     = "Order Managers",
                Locked   = true
            };

            modelBuilder.Entity<DirectoryNodeModel>()
                .HasData(new DirectoryNodeModel[]
                {
                    strategiesDirectory,
                    modulesDirectory,
                    pairSelectorsDirectory,
                    signalEmittersDirectory,
                    orderManagersDirectory
                });
        }
    }
}