# Clean Build Artifacts Script
# Removes compilation artifacts while keeping the final executables

param(
    [switch]$All
)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Clean Build Artifacts" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$releasePath = "src-tauri\target\release"

if (-not (Test-Path $releasePath)) {
    Write-Host "No build artifacts found" -ForegroundColor Green
    exit 0
}

# Calculate sizes before cleaning
$beforeFiles = Get-ChildItem -Path $releasePath -Recurse -File -ErrorAction SilentlyContinue
if ($beforeFiles) {
    $beforeSize = ($beforeFiles | Measure-Object -Property Length -Sum).Sum / 1GB
} else {
    $beforeSize = 0
}

Write-Host "Current size: $([math]::Round($beforeSize, 2)) GB" -ForegroundColor Yellow
Write-Host ""

if ($All) {
    Write-Host "Cleaning entire target directory..." -ForegroundColor Yellow
    Remove-Item -Path "src-tauri\target" -Recurse -Force
    Write-Host "All build artifacts removed" -ForegroundColor Green
    exit 0
}

Write-Host "Cleaning unnecessary files..." -ForegroundColor Yellow
Write-Host ""

# List of items to remove
$itemsToRemove = @(
    "deps",
    "incremental",
    ".fingerprint",
    "build",
    "examples",
    "*.pdb",
    "*.lib",
    "*.rlib",
    "*.d",
    "*.exp",
    "*.dll.lib",
    "*.dll.exp",
    "app.old.exe"
)

foreach ($item in $itemsToRemove) {
    $fullPath = Join-Path $releasePath $item
    if (Test-Path $fullPath) {
        $itemFiles = Get-ChildItem -Path $fullPath -Recurse -File -ErrorAction SilentlyContinue
        if ($itemFiles) {
            $itemSize = ($itemFiles | Measure-Object -Property Length -Sum).Sum / 1MB
            if ($itemSize -gt 1) {
                Write-Host "  Removing $item ($([math]::Round($itemSize, 2)) MB)..." -ForegroundColor Yellow
            }
        }
        Remove-Item -Path $fullPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "Cleanup complete!" -ForegroundColor Green
Write-Host ""

# Calculate sizes after cleaning
$afterFiles = Get-ChildItem -Path $releasePath -Recurse -File -ErrorAction SilentlyContinue
if ($afterFiles) {
    $afterSize = ($afterFiles | Measure-Object -Property Length -Sum).Sum / 1GB
} else {
    $afterSize = 0
}

$saved = $beforeSize - $afterSize

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Before: $([math]::Round($beforeSize, 2)) GB" -ForegroundColor Yellow
Write-Host "After:  $([math]::Round($afterSize, 2)) GB" -ForegroundColor Green
Write-Host "Saved:  $([math]::Round($saved, 2)) GB" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Essential files kept:" -ForegroundColor White
Write-Host "  - app.exe (3.7 MB)" -ForegroundColor Gray
Write-Host "  - resources/ (85 MB)" -ForegroundColor Gray
Write-Host ""
Write-Host "Usage:" -ForegroundColor White
Write-Host "  .\scripts\clean-build.ps1        Clean build artifacts" -ForegroundColor Gray
Write-Host "  .\scripts\clean-build.ps1 -All   Remove entire target/" -ForegroundColor Gray
Write-Host ""
