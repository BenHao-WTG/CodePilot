# PowerShell Script Testing Guide

This document provides instructions for testing the build.ps1 and publish.ps1 scripts.

## Quick Syntax Validation

### On Windows PowerShell

```powershell
# Test build.ps1 syntax
Get-Content build.ps1 -Raw | Invoke-Expression -ErrorAction Stop

# Test publish.ps1 syntax
Get-Content publish.ps1 -Raw | Invoke-Expression -ErrorAction Stop
```

### Using PowerShell Parser

```powershell
# Validate build.ps1
$buildScript = Get-Content ./build.ps1 -Raw
$null = [System.Management.Automation.PSParser]::Tokenize($buildScript, [ref]$null)
Write-Host "build.ps1 syntax is valid" -ForegroundColor Green

# Validate publish.ps1
$publishScript = Get-Content ./publish.ps1 -Raw
$null = [System.Management.Automation.PSParser]::Tokenize($publishScript, [ref]$null)
Write-Host "publish.ps1 syntax is valid" -ForegroundColor Green
```

## Testing build.ps1

### 1. Dry Run Test (Check Dependencies Only)

```powershell
# This will check dependencies and exit before building
# Modify the script temporarily or just check the first section
```

### 2. Test Parameter Recognition

```powershell
Get-Help ./build.ps1

# Should show:
# build.ps1 [-Clean] [-Debug]
```

### 3. Test with Mock/Minimal Environment

```powershell
# Test that functions are defined correctly
. ./build.ps1

# Verify functions exist
Get-Command Write-Info, Write-Success, Write-Error, Write-Warning
```

### 4. Full Build Test (Requires Dependencies)

```powershell
# Standard build
.\build.ps1

# Clean build
.\build.ps1 -Clean

# Debug build
.\build.ps1 -Debug

# Clean debug build
.\build.ps1 -Clean -Debug
```

## Testing publish.ps1

### 1. Test Parameter Recognition

```powershell
Get-Help ./publish.ps1

# Should show:
# publish.ps1 [[-Version] <string>] [[-OutputDir] <string>] [-SkipBuild]
```

### 2. Test Version Detection

```powershell
# This should read version from package.json
.\publish.ps1 -SkipBuild -WhatIf
```

### 3. Full Publish Test (Requires Build Artifacts)

```powershell
# Publish current version
.\publish.ps1

# Publish specific version
.\publish.ps1 -Version "1.0.0"

# Publish without rebuilding
.\publish.ps1 -SkipBuild

# Publish to custom directory
.\publish.ps1 -OutputDir "dist"
```

## Common Issues and Solutions

### Issue: "cannot be loaded because running scripts is disabled"

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: "Missing closing '}' in statement block"

**Solution:** This was the bug that has been fixed. If you still see this:
1. Ensure you have the latest version of the scripts
2. Check for file corruption
3. Re-download the scripts

### Issue: "The term 'node' is not recognized"

**Solution:** Install Node.js from https://nodejs.org/

### Issue: "The term 'rustc' is not recognized"

**Solution:** Install Rust from https://rustup.rs/

## Expected Output

### build.ps1 Success

```
==========================================
CodePilot Windows Build Script
==========================================

Checking dependencies...
✓ Node.js vX.X.X
✓ npm X.X.X
✓ Rust rustc X.X.X
✓ Cargo cargo X.X.X

Building Next.js frontend...
✓ Next.js build completed

Building Tauri Windows executable...
✓ Tauri build completed

Build artifacts:
  Executable: src-tauri\target\release\codepilot.exe
  Size: XX.XX MB

==========================================
Build completed successfully!
==========================================
```

### publish.ps1 Success

```
==========================================
CodePilot Windows Publish Script
==========================================

Version from package.json: 0.8.0
Publishing version: 0.8.0

Building application...
[... build output ...]

Preparing release directory...
✓ Created release directory

Copying build artifacts...
✓ Copied executable: CodePilot-0.8.0-windows.exe
✓ Copied MSI installer: CodePilot-0.8.0-windows-installer.msi

Creating release README...
✓ Created README.txt

Generating checksums...
✓ Created SHA256SUMS.txt

Release contents:
  CodePilot-0.8.0-windows.exe (XX.XX MB)
  CodePilot-0.8.0-windows-installer.msi (XX.XX MB)
  README.txt (X.XX MB)
  SHA256SUMS.txt (X.XX MB)

==========================================
Publish completed successfully!
==========================================
```

## Automated Test Script

Save this as `test-scripts.ps1`:

```powershell
# Automated test for build.ps1 and publish.ps1
Write-Host "PowerShell Script Test Suite" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$testsPassed = 0
$testsFailed = 0

function Test-ScriptSyntax {
    param([string]$ScriptPath)
    
    try {
        $script = Get-Content $ScriptPath -Raw
        $null = [System.Management.Automation.PSParser]::Tokenize($script, [ref]$null)
        Write-Host "✓ $ScriptPath syntax is valid" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "✗ $ScriptPath syntax error: $_" -ForegroundColor Red
        return $false
    }
}

# Test 1: build.ps1 syntax
Write-Host "Test 1: build.ps1 syntax validation" -ForegroundColor Yellow
if (Test-ScriptSyntax "build.ps1") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 2: publish.ps1 syntax
Write-Host "Test 2: publish.ps1 syntax validation" -ForegroundColor Yellow
if (Test-ScriptSyntax "publish.ps1") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 3: build.ps1 parameters
Write-Host "Test 3: build.ps1 parameter validation" -ForegroundColor Yellow
try {
    $help = Get-Help ./build.ps1 -ErrorAction Stop
    if ($help.Parameters.Parameter.Name -contains "Clean" -and 
        $help.Parameters.Parameter.Name -contains "Debug") {
        Write-Host "✓ build.ps1 parameters are correct" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "✗ build.ps1 parameters are incorrect" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "✗ build.ps1 parameter test failed: $_" -ForegroundColor Red
    $testsFailed++
}

# Test 4: publish.ps1 parameters
Write-Host "Test 4: publish.ps1 parameter validation" -ForegroundColor Yellow
try {
    $help = Get-Help ./publish.ps1 -ErrorAction Stop
    if ($help.Parameters.Parameter.Name -contains "Version" -and 
        $help.Parameters.Parameter.Name -contains "SkipBuild" -and
        $help.Parameters.Parameter.Name -contains "OutputDir") {
        Write-Host "✓ publish.ps1 parameters are correct" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "✗ publish.ps1 parameters are incorrect" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "✗ publish.ps1 parameter test failed: $_" -ForegroundColor Red
    $testsFailed++
}

# Summary
Write-Host ""
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Cyan
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor Red

if ($testsFailed -eq 0) {
    Write-Host ""
    Write-Host "All tests passed! ✓" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "Some tests failed! ✗" -ForegroundColor Red
    exit 1
}
```

Run it with:
```powershell
.\test-scripts.ps1
```

## CI/CD Integration

For automated testing in CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Test PowerShell Scripts
  shell: pwsh
  run: |
    $buildScript = Get-Content ./build.ps1 -Raw
    $null = [System.Management.Automation.PSParser]::Tokenize($buildScript, [ref]$null)
    Write-Host "build.ps1 syntax OK"
    
    $publishScript = Get-Content ./publish.ps1 -Raw
    $null = [System.Management.Automation.PSParser]::Tokenize($publishScript, [ref]$null)
    Write-Host "publish.ps1 syntax OK"
```

## Support

If you encounter issues:
1. Check PowerShell version: `$PSVersionTable.PSVersion`
2. Ensure scripts are using CRLF line endings on Windows
3. Verify file encoding is UTF-8
4. Check execution policy: `Get-ExecutionPolicy`
