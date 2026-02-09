# PowerShell script to compile and publish CodePilot WPF for Windows
# This script builds the production-ready Windows WPF application

Write-Host "CodePilot WPF + WebView2 Publish Script for Windows" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
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

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js 18 or higher from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green

# Check if npm is installed
Write-Host "Checking npm installation..." -ForegroundColor Yellow
$npmVersion = npm --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}
Write-Host "npm version: $npmVersion" -ForegroundColor Green
Write-Host ""

# Check version in package.json
Write-Host "Reading package version..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$version = $packageJson.version
Write-Host "Current version: $version" -ForegroundColor Green
Write-Host ""

# Clean previous build artifacts
Write-Host "Cleaning previous build artifacts..." -ForegroundColor Yellow
if (Test-Path "release") {
    Remove-Item -Path "release" -Recurse -Force
    Write-Host "Removed 'release' directory" -ForegroundColor Green
}
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force
    Write-Host "Removed '.next' directory" -ForegroundColor Green
}
if (Test-Path "CodePilot.Desktop\bin") {
    Remove-Item -Path "CodePilot.Desktop\bin" -Recurse -Force
    Write-Host "Removed 'CodePilot.Desktop\bin' directory" -ForegroundColor Green
}
if (Test-Path "CodePilot.Desktop\obj") {
    Remove-Item -Path "CodePilot.Desktop\obj" -Recurse -Force
    Write-Host "Removed 'CodePilot.Desktop\obj' directory" -ForegroundColor Green
}
if (Test-Path "CodePilot.Api\bin") {
    Remove-Item -Path "CodePilot.Api\bin" -Recurse -Force
    Write-Host "Removed 'CodePilot.Api\bin' directory" -ForegroundColor Green
}
if (Test-Path "CodePilot.Api\obj") {
    Remove-Item -Path "CodePilot.Api\obj" -Recurse -Force
    Write-Host "Removed 'CodePilot.Api\obj' directory" -ForegroundColor Green
}
Write-Host "Cleanup completed" -ForegroundColor Green
Write-Host ""

# Install Node.js dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install Node.js dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js dependencies installed successfully" -ForegroundColor Green
Write-Host ""

# Build Next.js frontend for production
Write-Host "Building Next.js frontend for production..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Next.js build failed" -ForegroundColor Red
    exit 1
}
Write-Host "Next.js build completed successfully" -ForegroundColor Green
Write-Host ""

# Copy Next.js output to API wwwroot
Write-Host "Copying Next.js output to API project..." -ForegroundColor Yellow

# Clean and recreate wwwroot directory
if (Test-Path "CodePilot.Api\wwwroot") {
    Write-Host "Cleaning existing wwwroot..." -ForegroundColor Gray
    Remove-Item -Path "CodePilot.Api\wwwroot\*" -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path "CodePilot.Api\wwwroot" -Force | Out-Null

# Copy the entire Next.js static export from 'out' directory
if (Test-Path "out") {
    Write-Host "Copying Next.js static export from 'out' directory..." -ForegroundColor Gray
    Copy-Item -Path "out\*" -Destination "CodePilot.Api\wwwroot\" -Recurse -Force
    Write-Host "Next.js output copied successfully" -ForegroundColor Green
} else {
    Write-Host "Warning: 'out' directory not found. Next.js static export may have failed." -ForegroundColor Yellow
}
Write-Host ""

# Publish API project
Write-Host "Publishing Blazor API project..." -ForegroundColor Yellow
dotnet publish CodePilot.Api\CodePilot.Api.csproj `
    --configuration Release `
    --output "CodePilot.Desktop\bin\Release\net8.0-windows\api" `
    --self-contained false
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: API publish failed" -ForegroundColor Red
    exit 1
}
Write-Host "API published successfully" -ForegroundColor Green
Write-Host ""

# Publish WPF Desktop project
Write-Host "Publishing WPF Desktop project..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow
dotnet publish CodePilot.Desktop\CodePilot.Desktop.csproj `
    --configuration Release `
    --runtime win-x64 `
    --self-contained true `
    --output "release\win-x64" `
    /p:PublishSingleFile=true `
    /p:IncludeNativeLibrariesForSelfExtract=true `
    /p:PublishReadyToRun=true
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: WPF publish failed" -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "WPF Desktop publish completed successfully!" -ForegroundColor Green
Write-Host ""

# Show build artifacts
Write-Host "Build artifacts:" -ForegroundColor Cyan
if (Test-Path "release\win-x64") {
    Get-ChildItem -Path "release\win-x64" -File | Where-Object { $_.Extension -eq ".exe" -or $_.Extension -eq ".dll" } | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        Write-Host "  - $($_.Name) ($size MB)" -ForegroundColor Green
    }
}
else {
    Write-Host "  No release artifacts found" -ForegroundColor Red
}
Write-Host ""

Write-Host "Publish process complete!" -ForegroundColor Green
Write-Host "Release files are in the 'release\win-x64' directory" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the executable in the 'release\win-x64' directory" -ForegroundColor White
Write-Host "2. Create an installer using tools like Inno Setup or WiX" -ForegroundColor White
Write-Host "3. Update version in package.json if needed (current: $version)" -ForegroundColor White
Write-Host "4. Create a GitHub Release and upload the artifacts" -ForegroundColor White
Write-Host "5. Write release notes describing the changes" -ForegroundColor White
Write-Host ""
Write-Host "Note: This is now a Windows-only WPF application." -ForegroundColor Cyan
Write-Host "WebView2 Runtime is required on target machines." -ForegroundColor Cyan
