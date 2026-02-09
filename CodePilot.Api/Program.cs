using CodePilot.Api.Data;
using CodePilot.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure database
var dataDir = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
    ".codepilot");

if (!Directory.Exists(dataDir))
{
    Directory.CreateDirectory(dataDir);
}

var dbPath = Path.Combine(dataDir, "codepilot.db");
builder.Services.AddDbContext<CodePilotDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// Register Copilot service
builder.Services.AddSingleton<ICopilotService, CopilotService>();

// Add CORS for local development
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CodePilotDbContext>();
    db.Database.EnsureCreated();
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

// Serve static files from wwwroot
app.UseStaticFiles();

app.UseRouting();
app.UseAuthorization();

app.MapControllers();

// Health check endpoint
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

// Fallback to index.html for SPA routing
app.MapFallbackToFile("index.html");

Console.WriteLine($"CodePilot API Server starting...");
Console.WriteLine($"Database: {dbPath}");
Console.WriteLine($"Environment: {app.Environment.EnvironmentName}");

app.Run();
