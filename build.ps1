# PowerShell script to build and run CodePilot WPF + Blazor project
# This script compiles and runs the project in development mode

Write-Host "CodePilot WPF + WebView2 + Blazor Build Script" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if .NET SDK is installed
Write-Host "Checking .NET SDK installation..." -ForegroundColor Yellow
$dotnetVersion = dotnet --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: .NET SDK is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install .NET 8.0 SDK or higher from https://dotnet.microsoft.com/download" -ForegroundColor Red
    exit 1
}
Write-Host ".NET SDK version: $dotnetVersion" -ForegroundColor Green
Write-Host ""

# Restore .NET dependencies
Write-Host "Restoring .NET dependencies..." -ForegroundColor Yellow
dotnet restore CodePilot.sln
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to restore .NET dependencies" -ForegroundColor Red
    exit 1
}
Write-Host ".NET dependencies restored successfully" -ForegroundColor Green
Write-Host ""

# Build .NET solution (includes Blazor compilation)
Write-Host "Building .NET solution with Blazor..." -ForegroundColor Yellow
dotnet build CodePilot.sln --configuration Debug
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: .NET build failed" -ForegroundColor Red
    exit 1
}
Write-Host ".NET build completed successfully" -ForegroundColor Green
Write-Host ""

# Ask user if they want to run the app
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""
$runApp = Read-Host "Do you want to run the WPF application? (Y/N)"
if ($runApp -eq "Y" -or $runApp -eq "y") {
    Write-Host ""
    Write-Host "Starting WPF application with Blazor..." -ForegroundColor Yellow
    Write-Host "The application will start and Blazor Server will be hosted within the API." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Yellow
    Write-Host ""
    dotnet run --project CodePilot.Desktop\CodePilot.Desktop.csproj --configuration Debug
}
else {
    Write-Host "Build process complete. Run 'dotnet run --project CodePilot.Desktop\CodePilot.Desktop.csproj' to start the application." -ForegroundColor Cyan
}
