# publish.ps1 - Publish CodePilot for Windows
# This script builds and prepares release artifacts for distribution

param(
    [string]$Version = "",
    [switch]$SkipBuild = $false,
    [string]$OutputDir = "release"
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
Write-Info "CodePilot Windows Publish Script"
Write-Info "=========================================="
Write-Info ""

# Get version from package.json if not provided
if (-not $Version) {
    if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        $Version = $packageJson.version
        Write-Info "Version from package.json: $Version"
    } else {
        Write-Error "Cannot determine version. Please provide -Version parameter or ensure package.json exists."
        exit 1
    }
}

# Validate version format (semantic versioning)
if ($Version -notmatch '^\d+\.\d+\.\d+') {
    Write-Error "Invalid version format. Expected: X.Y.Z (e.g., 1.0.0)"
    exit 1
}

Write-Info "Publishing version: $Version"
Write-Info ""

# Build the application if not skipped
if (-not $SkipBuild) {
    Write-Info "Building application..."
    & "$PSScriptRoot/build.ps1" -Clean
    if ($LASTEXITCODE -ne 0) {
        Write-Error "✗ Build failed"
        exit 1
    }
    Write-Info ""
}

# Create output directory
Write-Info "Preparing release directory..."
if (Test-Path $OutputDir) {
    Write-Warning "Removing existing $OutputDir directory..."
    Remove-Item -Recurse -Force $OutputDir
}
New-Item -ItemType Directory -Path $OutputDir | Out-Null
Write-Success "✓ Created $OutputDir directory"
Write-Info ""

# Copy build artifacts
Write-Info "Copying build artifacts..."
$targetDir = "src-tauri/target/release"
$versionedName = "CodePilot-${Version}-windows"

# Copy executable
$exePath = Get-ChildItem -Path $targetDir -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($exePath) {
    $destExe = Join-Path $OutputDir "${versionedName}.exe"
    Copy-Item $exePath.FullName $destExe
    Write-Success "✓ Copied executable: ${versionedName}.exe"
} else {
    Write-Warning "No .exe file found in $targetDir"
}

# Copy installer/bundle if exists
$bundleDir = "$targetDir/bundle"
if (Test-Path $bundleDir) {
    # Copy MSI installer
    Get-ChildItem -Path $bundleDir -Filter "*.msi" -Recurse | ForEach-Object {
        $destMsi = Join-Path $OutputDir "${versionedName}-installer.msi"
        Copy-Item $_.FullName $destMsi
        Write-Success "✓ Copied MSI installer: ${versionedName}-installer.msi"
    }
    
    # Copy NSIS installer if exists
    Get-ChildItem -Path $bundleDir -Filter "*-setup.exe" -Recurse | ForEach-Object {
        $destSetup = Join-Path $OutputDir "${versionedName}-setup.exe"
        Copy-Item $_.FullName $destSetup
        Write-Success "✓ Copied NSIS installer: ${versionedName}-setup.exe"
    }
}

Write-Info ""

# Create a README for the release
Write-Info "Creating release README..."
$readmeContent = @"
# CodePilot v$Version - Windows Release

## Installation

### Option 1: MSI Installer (Recommended)
1. Run ``${versionedName}-installer.msi``
2. Follow the installation wizard
3. Launch CodePilot from the Start Menu

### Option 2: Standalone Executable
1. Extract ``${versionedName}.exe`` to your preferred location
2. Double-click to run

## Requirements
- Windows 10 or later (64-bit)
- GitHub Token with Copilot access

## Configuration
1. Open CodePilot
2. Go to Settings → Providers
3. Add your GitHub token
4. Start chatting!

## Build Information
- Version: $Version
- Build Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
- Platform: Windows x64

## Support
For issues or questions, visit: https://github.com/BenHao-WTG/CodePilot

"@

$readmeContent | Out-File -FilePath (Join-Path $OutputDir "README.txt") -Encoding UTF8
Write-Success "✓ Created README.txt"
Write-Info ""

# Create checksums
Write-Info "Generating checksums..."
Get-ChildItem -Path $OutputDir -File | ForEach-Object {
    $hash = Get-FileHash $_.FullName -Algorithm SHA256
    $checksumLine = "$($hash.Hash.ToLower())  $($_.Name)"
    Add-Content -Path (Join-Path $OutputDir "SHA256SUMS.txt") -Value $checksumLine
}
Write-Success "✓ Created SHA256SUMS.txt"
Write-Info ""

# Display release contents
Write-Info "Release contents:"
Get-ChildItem -Path $OutputDir -File | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 2)
    Write-Info "  $($_.Name) ($size MB)"
}

Write-Info ""
Write-Success "=========================================="
Write-Success "Publish completed successfully!"
Write-Success "=========================================="
Write-Info ""
Write-Info "Release artifacts are in: $((Resolve-Path $OutputDir).Path)"
Write-Info ""
Write-Info "Next steps:"
Write-Info "  1. Test the installers on a clean Windows machine"
Write-Info "  2. Create a GitHub release at https://github.com/BenHao-WTG/CodePilot/releases"
Write-Info "  3. Upload files from $OutputDir directory"
Write-Info "  4. Add release notes describing changes in v$Version"
Write-Info ""
