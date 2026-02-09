# PowerShell script to compile and publish CodePilot Blazor for Windows
# This script builds the production-ready Windows WPF + Blazor application

Write-Host "CodePilot WPF + Blazor Publish Script for Windows" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
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

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
Remove-Item -Path "release" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "CodePilot.Desktop\bin" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "CodePilot.Desktop\obj" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "CodePilot.Api\bin" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "CodePilot.Api\obj" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Cleaned old artifacts" -ForegroundColor Green
Write-Host ""

# Restore dependencies
Write-Host "Restoring .NET dependencies..." -ForegroundColor Yellow
dotnet restore CodePilot.sln
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: dotnet restore failed" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies restored" -ForegroundColor Green
Write-Host ""

# Publish for Windows
Write-Host "Publishing WPF + Blazor application for Windows x64..." -ForegroundColor Yellow
dotnet publish CodePilot.Desktop\CodePilot.Desktop.csproj `
    -c Release `
    -r win-x64 `
    --self-contained true `
    -p:PublishSingleFile=false `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    -o "release\windows-x64"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Publish failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Published artifacts:" -ForegroundColor Cyan
Write-Host "  Location: release\windows-x64\" -ForegroundColor Yellow
Write-Host "  Executable: CodePilot.Desktop.exe" -ForegroundColor Yellow
Write-Host ""
Write-Host "Package contents:" -ForegroundColor Cyan
Get-ChildItem -Path "release\windows-x64" | ForEach-Object {
    $size = if ($_.PSIsContainer) { "DIR" } else { "{0:N2} MB" -f ($_.Length / 1MB) }
    Write-Host "  $($_.Name.PadRight(40)) $size" -ForegroundColor Gray
}

Write-Host ""
Write-Host "To distribute:" -ForegroundColor Cyan
Write-Host "  1. Zip the 'release\windows-x64' folder" -ForegroundColor Yellow
Write-Host "  2. Distribute the zip file to users" -ForegroundColor Yellow
Write-Host "  3. Users extract and run CodePilot.Desktop.exe" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: This build includes Blazor UI (no Node.js needed at runtime)" -ForegroundColor Gray
Write-Host ""
