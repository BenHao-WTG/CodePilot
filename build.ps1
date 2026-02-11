# build.ps1 - Build CodePilot for Windows using Tauri
# This script builds the Next.js frontend and Tauri Windows executable

param(
    [switch]$Clean = $false,
    [switch]$Debug = $false
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }

Write-Info "=========================================="
Write-Info "CodePilot Windows Build Script"
Write-Info "=========================================="
Write-Info ""

# Check if Node.js is installed
Write-Info "Checking dependencies..."
try {
    $nodeVersion = node --version
    Write-Success "✓ Node.js $nodeVersion"
} catch {
    Write-Error "✗ Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Success "✓ npm $npmVersion"
} catch {
    Write-Error "✗ npm is not installed."
    exit 1
}

# Check if Rust is installed
try {
    $rustVersion = rustc --version
    Write-Success "✓ Rust $rustVersion"
} catch {
    Write-Error "✗ Rust is not installed. Please install from https://rustup.rs/"
    exit 1
}

# Check if Cargo is installed
try {
    $cargoVersion = cargo --version
    Write-Success "✓ Cargo $cargoVersion"
} catch {
    Write-Error "✗ Cargo is not installed."
    exit 1
}

Write-Info ""

# Clean build if requested
if ($Clean) {
    Write-Warning "Cleaning previous builds..."
    if (Test-Path "out") {
        Remove-Item -Recurse -Force "out"
        Write-Success "✓ Removed out/ directory"
    }
    if (Test-Path "src-tauri/target") {
        Remove-Item -Recurse -Force "src-tauri/target"
        Write-Success "✓ Removed src-tauri/target/ directory"
    }
    if (Test-Path ".next") {
        Remove-Item -Recurse -Force ".next"
        Write-Success "✓ Removed .next/ directory"
    }
    Write-Info ""
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Info "Installing npm dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "✗ npm install failed"
        exit 1
    }
    Write-Success "✓ Dependencies installed"
    Write-Info ""
}

# Build Next.js application
Write-Info "Building Next.js frontend..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "✗ Next.js build failed"
    exit 1
}
Write-Success "✓ Next.js build completed"
Write-Info ""

# Build Tauri application
Write-Info "Building Tauri Windows executable..."
if ($Debug) {
    Write-Warning "Building in DEBUG mode..."
    npm run tauri build -- --debug
} else {
    npm run tauri build
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "✗ Tauri build failed"
    exit 1
}
Write-Success "✓ Tauri build completed"
Write-Info ""

# Find and display the built executable
Write-Info "Build artifacts:"
$targetDir = if ($Debug) { "src-tauri/target/debug" } else { "src-tauri/target/release" }
$exePath = Get-ChildItem -Path $targetDir -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($exePath) {
    Write-Success "  Executable: $($exePath.FullName)"
    $size = [math]::Round($exePath.Length / 1MB, 2)
    Write-Info "  Size: $size MB"
} else {
    Write-Warning "  No .exe file found in $targetDir"
}

# Check for installer/bundle
$bundleDir = "$targetDir/bundle"
if (Test-Path $bundleDir) {
    Write-Info "  Bundle directory: $bundleDir"
    Get-ChildItem -Path $bundleDir -Include "*.msi","*.exe" -Recurse | ForEach-Object {
        Write-Success "  Installer: $($_.FullName)"
    }
}

Write-Info ""
Write-Success "=========================================="
Write-Success "Build completed successfully!"
Write-Success "=========================================="
Write-Info ""
Write-Info "To run the application:"
Write-Info "  $targetDir\codepilot.exe"
Write-Info ""
