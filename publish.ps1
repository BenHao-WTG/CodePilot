# PowerShell script to compile and publish CodePilot for Windows
# This script builds the production-ready Windows runtime package

Write-Host "CodePilot Publish Script for Windows" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

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
if (Test-Path "dist-electron") {
    Remove-Item -Path "dist-electron" -Recurse -Force
    Write-Host "Removed 'dist-electron' directory" -ForegroundColor Green
}
Write-Host "Cleanup completed" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies installed successfully" -ForegroundColor Green
Write-Host ""

# Build the Windows package
Write-Host "Building Windows package..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow
npm run electron:pack:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Windows package build failed" -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "Windows package build completed successfully!" -ForegroundColor Green
Write-Host ""

# Rebuild better-sqlite3 for local development environment
Write-Host "Rebuilding better-sqlite3 for local development..." -ForegroundColor Yellow
npm rebuild better-sqlite3
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Failed to rebuild better-sqlite3 (non-critical)" -ForegroundColor Yellow
}
else {
    Write-Host "better-sqlite3 rebuilt successfully" -ForegroundColor Green
}
Write-Host ""

# Show build artifacts
Write-Host "Build artifacts:" -ForegroundColor Cyan
if (Test-Path "release") {
    Get-ChildItem -Path "release" -File | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        Write-Host "  - $($_.Name) ($size MB)" -ForegroundColor Green
    }
}
else {
    Write-Host "  No release artifacts found" -ForegroundColor Red
}
Write-Host ""

Write-Host "Publish process complete!" -ForegroundColor Green
Write-Host "Release files are in the 'release' directory" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the installer in the 'release' directory" -ForegroundColor White
Write-Host "2. Update version in package.json if needed (current: $version)" -ForegroundColor White
Write-Host "3. Create a GitHub Release and upload the artifacts" -ForegroundColor White
Write-Host "4. Write release notes describing the changes" -ForegroundColor White
