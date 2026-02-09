using CodePilot.Api.Data;
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

// Configure static files for Next.js output
builder.Services.AddSpaStaticFiles(configuration =>
{
    configuration.RootPath = "wwwroot";
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
app.UseStaticFiles();

if (!string.IsNullOrEmpty(builder.Configuration["SpaStaticFilesRootPath"]))
{
    app.UseSpaStaticFiles();
}

app.UseRouting();
app.UseAuthorization();

app.MapControllers();

// Health check endpoint
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

// Serve Next.js SPA
app.UseSpa(spa =>
{
    spa.Options.SourcePath = "wwwroot";
    
    if (app.Environment.IsDevelopment())
    {
        // In development, proxy to Next.js dev server if available
        spa.UseProxyToSpaDevelopmentServer("http://localhost:3000");
    }
});

app.Run();
