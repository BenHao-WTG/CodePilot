# CodePilot Launcher
param([switch]$SkipBuild = $false)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CodePilot Launcher" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "X Node.js is not installed" -ForegroundColor Red
    exit 1
}
Write-Host "√ Node.js $nodeVersion" -ForegroundColor Green

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Build Next.js if needed
if ((-not (Test-Path ".next\standalone")) -or (-not $SkipBuild)) {
    Write-Host "Building Next.js..." -ForegroundColor Yellow
    npm run build
    Write-Host "√ Build completed" -ForegroundColor Green
}

# Start Next.js server
Write-Host "Starting Next.js server..." -ForegroundColor Yellow
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    node .next\standalone\server.js
}

Start-Sleep -Seconds 3

# Find exe
$exePath = $null
if (Test-Path "src-tauri\target\release\app.exe") {
    $exePath = "src-tauri\target\release\app.exe"
} elseif (Test-Path "src-tauri\target\release\CodePilot.exe") {
    $exePath = "src-tauri\target\release\CodePilot.exe"
}

if ($exePath) {
    Write-Host "Launching CodePilot..." -ForegroundColor Green
    Start-Process $exePath
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Wait-Job $serverJob
} else {
    Write-Host "X Executable not found. Run build.ps1 first" -ForegroundColor Red
    Stop-Job $serverJob
    Remove-Job $serverJob
    exit 1
}

Stop-Job $serverJob
Remove-Job $serverJob
