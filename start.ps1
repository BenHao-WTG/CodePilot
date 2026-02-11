# CodePilot Launcher - Simple Version
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CodePilot Launcher" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if standalone build exists and has static files
if (-not (Test-Path ".next\standalone\server.js")) {
    Write-Host "X Standalone build not found. Please run: npm run build" -ForegroundColor Red
    exit 1
}

# Ensure static files are copied
if (-not (Test-Path ".next\standalone\.next\static")) {
    Write-Host "Copying static files..." -ForegroundColor Yellow
    if (Test-Path ".next\static") {
        if (-not (Test-Path ".next\standalone\.next")) {
            New-Item -Path ".next\standalone\.next" -ItemType Directory -Force | Out-Null
        }
        Copy-Item -Path ".next\static" -Destination ".next\standalone\.next\static" -Recurse -Force
        Write-Host "√ Static files copied" -ForegroundColor Green
    } else {
        Write-Host "! Warning: .next/static not found" -ForegroundColor Yellow
    }
}

# Check if server is already running
$existingServer = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -and (Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue | Where-Object LocalPort -eq 3002)
}

if ($existingServer) {
    Write-Host "√ Next.js server is already running (PID: $($existingServer.Id))" -ForegroundColor Green
} else {
    Write-Host "Starting Next.js server..." -ForegroundColor Yellow
    
    # Start server in background
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "node"
    $psi.Arguments = ".next\standalone\server.js"
    $psi.WorkingDirectory = $PWD
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.EnvironmentVariables["PORT"] = "3002"
    
    $process = [System.Diagnostics.Process]::Start($psi)
    Write-Host "√ Server started (PID: $($process.Id))" -ForegroundColor Green
    
    # Wait for server to be ready
    Write-Host "Waiting for server to start..." -ForegroundColor Yellow
    $maxAttempts = 10
    $attempt = 0
    $ready = $false
    
    while ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 1
        $attempt++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3002" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            $ready = $true
            break
        } catch {
            Write-Host "." -NoNewline -ForegroundColor Yellow
        }
    }
    
    if ($ready) {
        Write-Host ""
        Write-Host "√ Server is ready!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "! Server may not be ready yet, but launching anyway..." -ForegroundColor Yellow
    }
}

Write-Host ""

# Find and launch app
$exePath = $null
if (Test-Path "src-tauri\target\release\app.exe") {
    $exePath = "src-tauri\target\release\app.exe"
} elseif (Test-Path "src-tauri\target\release\CodePilot.exe") {
    $exePath = "src-tauri\target\release\CodePilot.exe"
}

if ($exePath) {
    Write-Host "Launching CodePilot..." -ForegroundColor Green
    Start-Process $exePath
    Write-Host "√ Application started!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: The Next.js server will continue running." -ForegroundColor Cyan
    Write-Host "To stop it, run: Get-Process node | Where-Object {`$_.MainWindowTitle -eq ''} | Stop-Process" -ForegroundColor Cyan
} else {
    Write-Host "X Executable not found. Please run build.ps1 first" -ForegroundColor Red
    exit 1
}
