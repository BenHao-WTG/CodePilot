using CodePilot.Api.Data;
using CodePilot.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Components;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add Blazor Server services
builder.Services.AddRazorPages();
builder.Services.AddServerSideBlazor();
builder.Services.AddHttpClient();

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

// Add DbContextFactory for Blazor
builder.Services.AddDbContextFactory<CodePilotDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// Register Copilot service
builder.Services.AddSingleton<ICopilotService, CopilotService>();

// Configure HttpClient for Blazor components
builder.Services.AddScoped(sp =>
{
    var navigationManager = sp.GetRequiredService<NavigationManager>();
    return new HttpClient { BaseAddress = new Uri(navigationManager.BaseUri) };
});

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

// Map Blazor Hub and pages
app.MapBlazorHub();
app.MapFallbackToPage("/_Host");

// Health check endpoint
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

Console.WriteLine($"CodePilot API Server starting...");
Console.WriteLine($"Database: {dbPath}");
Console.WriteLine($"Environment: {app.Environment.EnvironmentName}");

app.Run();
