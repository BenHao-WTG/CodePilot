using Microsoft.EntityFrameworkCore;

namespace CodePilot.Api.Data
{
    public class CodePilotDbContext : DbContext
    {
        public CodePilotDbContext(DbContextOptions<CodePilotDbContext> options)
            : base(options)
        {
        }

        public DbSet<ChatSession> ChatSessions { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<Setting> Settings { get; set; }
        public DbSet<TaskItem> Tasks { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure ChatSession
            modelBuilder.Entity<ChatSession>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasIndex(e => e.UpdatedAt);
            });

            // Configure Message
            modelBuilder.Entity<Message>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SessionId).IsRequired();
                entity.Property(e => e.Role).IsRequired();
                entity.Property(e => e.Content).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.HasIndex(e => e.SessionId);
                entity.HasIndex(e => e.CreatedAt);
                
                // Foreign key relationship
                entity.HasOne<ChatSession>()
                    .WithMany()
                    .HasForeignKey(e => e.SessionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure Setting
            modelBuilder.Entity<Setting>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Key).IsRequired();
                entity.Property(e => e.Value).IsRequired();
                entity.HasIndex(e => e.Key).IsUnique();
            });

            // Configure TaskItem
            modelBuilder.Entity<TaskItem>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SessionId).IsRequired();
                entity.Property(e => e.Title).IsRequired();
                entity.Property(e => e.Status).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasIndex(e => e.SessionId);
                
                // Foreign key relationship
                entity.HasOne<ChatSession>()
                    .WithMany()
                    .HasForeignKey(e => e.SessionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }

    public class ChatSession
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = "New Chat";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public string Model { get; set; } = string.Empty;
        public string SystemPrompt { get; set; } = string.Empty;
        public string WorkingDirectory { get; set; } = string.Empty;
        public string SdkSessionId { get; set; } = string.Empty;
        public string ProjectName { get; set; } = string.Empty;
        public string Status { get; set; } = "active";
        public string? Mode { get; set; }
    }

    public class Message
    {
        public string Id { get; set; } = string.Empty;
        public string SessionId { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? TokenUsage { get; set; }
    }

    public class Setting
    {
        public int Id { get; set; }
        public string Key { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
    }

    public class TaskItem
    {
        public string Id { get; set; } = string.Empty;
        public string SessionId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Status { get; set; } = "pending";
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
