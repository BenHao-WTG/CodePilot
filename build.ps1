# PowerShell script to build and run CodePilot WPF project
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

# Install Node.js dependencies if node_modules doesn't exist
if (!(Test-Path "node_modules")) {
    Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install Node.js dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "Node.js dependencies installed successfully" -ForegroundColor Green
    Write-Host ""
}

# Build Next.js frontend
Write-Host "Building Next.js frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Next.js build failed" -ForegroundColor Red
    exit 1
}
Write-Host "Next.js build completed successfully" -ForegroundColor Green
Write-Host ""

# Copy Next.js output to API wwwroot
Write-Host "Copying Next.js output to API project..." -ForegroundColor Yellow
if (!(Test-Path "CodePilot.Api\wwwroot")) {
    New-Item -ItemType Directory -Path "CodePilot.Api\wwwroot" -Force | Out-Null
}

# Copy .next/standalone and public to wwwroot
if (Test-Path ".next\static") {
    Copy-Item -Path ".next\static" -Destination "CodePilot.Api\wwwroot\_next\" -Recurse -Force
}
if (Test-Path "public") {
    Copy-Item -Path "public\*" -Destination "CodePilot.Api\wwwroot\" -Recurse -Force
}
Write-Host "Next.js output copied successfully" -ForegroundColor Green
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

# Build .NET solution
Write-Host "Building .NET solution..." -ForegroundColor Yellow
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
    Write-Host "Starting WPF application..." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Yellow
    Write-Host ""
    dotnet run --project CodePilot.Desktop\CodePilot.Desktop.csproj --configuration Debug
}
else {
    Write-Host "Build process complete. Run 'dotnet run --project CodePilot.Desktop\CodePilot.Desktop.csproj' to start the application." -ForegroundColor Cyan
}
