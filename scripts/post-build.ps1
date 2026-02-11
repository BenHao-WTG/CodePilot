# Post-build script for Next.js standalone mode
# Copies necessary static files to standalone directory

$ErrorActionPreference = "Stop"

Write-Host "Post-build: Copying static files for standalone mode..." -ForegroundColor Cyan

# Check if standalone build exists
if (-not (Test-Path ".next\standalone")) {
    Write-Host "Error: .next\standalone directory not found" -ForegroundColor Red
    exit 1
}

# Copy static files
if (Test-Path ".next\static") {
    Write-Host "Copying .next/static..." -ForegroundColor Yellow
    
    # Remove existing if present
    if (Test-Path ".next\standalone\.next\static") {
        Remove-Item -Path ".next\standalone\.next\static" -Recurse -Force
    }
    
    # Ensure .next directory exists in standalone
    if (-not (Test-Path ".next\standalone\.next")) {
        New-Item -Path ".next\standalone\.next" -ItemType Directory -Force | Out-Null
    }
    
    Copy-Item -Path ".next\static" -Destination ".next\standalone\.next\static" -Recurse -Force
    Write-Host "√ Static files copied" -ForegroundColor Green
} else {
    Write-Host "Warning: .next/static not found" -ForegroundColor Yellow
}

# Copy public files (if not already present)
if (Test-Path "public") {
    if (-not (Test-Path ".next\standalone\public")) {
        Write-Host "Copying public..." -ForegroundColor Yellow
        Copy-Item -Path "public" -Destination ".next\standalone\public" -Recurse -Force
        Write-Host "√ Public files copied" -ForegroundColor Green
    } else {
        Write-Host "√ Public files already present" -ForegroundColor Green
    }
} else {
    Write-Host "Warning: public directory not found" -ForegroundColor Yellow
}

Write-Host "Post-build completed!" -ForegroundColor Green
