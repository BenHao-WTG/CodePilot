# build.ps1 - Build CWorker for Windows using Tauri
# This script builds the complete CWorker application with embedded Next.js server

param(
    [switch]$Clean = $false,
    [switch]$Debug = $false
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Info {
    Write-Host $args -ForegroundColor Cyan
}
function Write-Success {
    Write-Host $args -ForegroundColor Green
}
function Write-Error {
    Write-Host $args -ForegroundColor Red
}
function Write-Warning {
    Write-Host $args -ForegroundColor Yellow
}

Write-Info "=========================================="
Write-Info "CWorker Windows Build Script"
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
    if (Test-Path ".next") {
        Remove-Item -Recurse -Force ".next"
        Write-Success "✓ Removed .next/ directory"
    }
    if (Test-Path "src-tauri/target") {
        Remove-Item -Recurse -Force "src-tauri/target"
        Write-Success "✓ Removed src-tauri/target/ directory"
    }
    if (Test-Path "src-tauri/resources") {
        Remove-Item -Recurse -Force "src-tauri/resources"
        Write-Success "✓ Removed src-tauri/resources/ directory"
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

# Step 1: Build Next.js application
Write-Info "Step 1/3: Building Next.js application..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "✗ Next.js build failed"
    exit 1
}
Write-Success "✓ Next.js build completed"
Write-Info ""

# Step 2: Prepare Next.js server for bundling
Write-Info "Step 2/3: Preparing Next.js server for bundling..."
node scripts/build-sidecar.js
if ($LASTEXITCODE -ne 0) {
    Write-Error "✗ Server preparation failed"
    exit 1
}
Write-Success "✓ Server files prepared"

# Clean up .next directory after copying to resources (saves disk space)
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Success "✓ Cleaned up .next directory (already copied to resources)"
}

# Copy static resources to resources directory
if (Test-Path "src-tauri/static/splash.html") {
    if (-not (Test-Path "src-tauri/resources")) {
        New-Item -ItemType Directory -Path "src-tauri/resources" -Force | Out-Null
    }
    Copy-Item -Path "src-tauri/static/splash.html" -Destination "src-tauri/resources/splash.html" -Force
    Write-Success "✓ Copied splash.html to resources"
}
Write-Info ""

# Step 3: Build Tauri application
Write-Info "Step 3/3: Building Tauri application..."
if ($Debug) {
    Write-Warning "Building in DEBUG mode..."
    npx tauri build --debug
} else {
    npx tauri build
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "✗ Tauri build failed"
    exit 1
}
Write-Success "✓ Tauri build completed"
Write-Info ""

# Clean up unnecessary files in release build to reduce size
if (-not $Debug) {
    Write-Info "Cleaning up unnecessary files in release folder..."
    $releaseDir = "src-tauri/target/release"
    
    # Remove .pdb debug files (can save hundreds of MB)
    $pdbFiles = Get-ChildItem -Path $releaseDir -Filter "*.pdb" -ErrorAction SilentlyContinue
    foreach ($file in $pdbFiles) {
        Remove-Item $file.FullName -Force
        Write-Success "  ✓ Removed $($file.Name)"
    }
    
    # Remove incremental compilation files (safe to delete after build)
    if (Test-Path "$releaseDir/incremental") {
        Remove-Item -Recurse -Force "$releaseDir/incremental"
        Write-Success "  ✓ Removed incremental/ directory"
    }
    
    # Remove .d files (dependency files, not needed after build)
    $dFiles = Get-ChildItem -Path $releaseDir -Filter "*.d" -ErrorAction SilentlyContinue
    foreach ($file in $dFiles) {
        Remove-Item $file.FullName -Force
    }
    if ($dFiles.Count -gt 0) {
        Write-Success "  ✓ Removed $($dFiles.Count) .d dependency files"
    }
    
    # Remove fingerprint directory (build cache, not needed)
    if (Test-Path "$releaseDir/.fingerprint") {
        Remove-Item -Recurse -Force "$releaseDir/.fingerprint"
        Write-Success "  ✓ Removed .fingerprint/ directory"
    }
    
    # Remove build directory (intermediate files)
    if (Test-Path "$releaseDir/build") {
        Remove-Item -Recurse -Force "$releaseDir/build"
        Write-Success "  ✓ Removed build/ directory"
    }
    
    Write-Info ""
}

Write-Info "Note: src-tauri/resources/ is kept for future builds"
Write-Info "      Run with -Clean to remove all build artifacts"
Write-Info ""

# Find and display the built executable
Write-Info "Build artifacts:"
$targetDir = if ($Debug) { "src-tauri/target/debug" } else { "src-tauri/target/release" }
$exePath = Get-ChildItem -Path $targetDir -Filter "CWorker.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $exePath) {
    $exePath = Get-ChildItem -Path $targetDir -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
}

if ($exePath) {
    Write-Success "  Executable: $($exePath.FullName)"
    $size = [math]::Round($exePath.Length / 1MB, 2)
    Write-Info "  Size: $size MB"
} else {
    Write-Warning "  No .exe file found in $targetDir"
}

Write-Info ""
Write-Success "=========================================="
Write-Success "Build completed successfully!"
Write-Success "=========================================="
Write-Info ""
if ($exePath) {
    Write-Info "To run CWorker:"
    Write-Success "  $($exePath.FullName)"
    Write-Info ""
    Write-Info "Note: The executable contains an embedded Next.js server."
    Write-Info "      Node.js is required on the target system to run the app."
    Write-Info ""
}
