# Quick Start Guide: WPF + WebView2 + Blazor

## Overview

This guide helps you build and run the migrated CodePilot application with WPF + WebView2 + Blazor architecture.

## Prerequisites

### Required
- ✅ Windows 10 or Windows 11
- ✅ .NET 8.0 SDK - [Download](https://dotnet.microsoft.com/download/dotnet/8.0)
- ✅ Node.js 18+ - [Download](https://nodejs.org/)
- ✅ WebView2 Runtime (usually pre-installed on Windows 10/11)

### Optional
- Visual Studio 2022 (for IDE development)
- Visual Studio Code with C# extension

## Quick Build & Run

### Option 1: Using PowerShell Scripts (Recommended)

```powershell
# Development build and run
.\build.ps1
# When prompted, choose 'Y' to run the application

# Production package
.\publish.ps1
```

### Option 2: Manual Build

```powershell
# Step 1: Install Node.js dependencies
npm install

# Step 2: Build Next.js frontend
npm run build

# Step 3: Copy Next.js output to API (if not automated)
# The build.ps1 script handles this automatically

# Step 4: Restore .NET packages
dotnet restore CodePilot.sln

# Step 5: Build the solution
dotnet build CodePilot.sln --configuration Debug

# Step 6: Run the WPF application
dotnet run --project CodePilot.Desktop\CodePilot.Desktop.csproj
```

## Project Structure

```
CodePilot/
├── CodePilot.Desktop/          # WPF Application (Entry Point)
│   ├── MainWindow.xaml         # Main window with WebView2
│   ├── ApiServer.cs            # Manages Blazor API subprocess
│   └── CodePilot.Desktop.csproj
│
├── CodePilot.Api/              # Blazor Web API (Backend)
│   ├── Controllers/            # REST API controllers
│   ├── Data/                   # EF Core database context
│   ├── wwwroot/                # Static files (Next.js output goes here)
│   └── CodePilot.Api.csproj
│
├── src/                        # Next.js Frontend (Unchanged)
│   ├── app/                    # Next.js app router
│   ├── components/             # React components
│   └── lib/                    # Utilities
│
├── build.ps1                   # Development build script
├── publish.ps1                 # Production packaging script
└── CodePilot.sln               # Visual Studio solution
```

## Build Process Explained

### What happens when you run `build.ps1`:

1. **Check Prerequisites**
   - Verifies .NET SDK installation
   - Verifies Node.js/npm installation

2. **Build Next.js Frontend**
   - Runs `npm install` (if needed)
   - Runs `npm run build`
   - Generates static files in `.next/`

3. **Copy Frontend to API**
   - Copies `.next/static` to `CodePilot.Api/wwwroot/_next/`
   - Copies `public/*` to `CodePilot.Api/wwwroot/`

4. **Build .NET Solution**
   - Runs `dotnet restore`
   - Runs `dotnet build`
   - Compiles both WPF and API projects

5. **Run Application** (if you choose 'Y')
   - Launches `CodePilot.Desktop.exe`
   - WPF window opens with WebView2
   - ApiServer.cs spawns Blazor API process
   - WebView2 navigates to `http://localhost:{port}`
   - Next.js UI loads in WebView2

## How the Application Works

```
┌─────────────────────────────┐
│  CodePilot.Desktop.exe      │  (WPF Application)
│  ┌────────────────────────┐ │
│  │  MainWindow.xaml       │ │
│  │  ┌──────────────────┐  │ │
│  │  │  WebView2        │  │ │  Displays Next.js UI
│  │  │  (Chromium)      │  │ │
│  │  └──────────────────┘  │ │
│  └────────────────────────┘ │
└─────────────────────────────┘
         │
         │ HTTP (localhost:port)
         ▼
┌─────────────────────────────┐
│  CodePilot.Api.dll          │  (Blazor API Process)
│  ┌────────────────────────┐ │
│  │  ASP.NET Core          │ │  Serves REST API
│  │  ┌──────────────────┐  │ │
│  │  │  Controllers     │  │ │  /api/chat/sessions
│  │  │  /api/*          │  │ │  /api/chat
│  │  └──────────────────┘  │ │  /api/settings
│  │  ┌──────────────────┐  │ │  /api/tasks
│  │  │  EF Core         │  │ │  /api/files
│  │  │  SQLite          │  │ │
│  │  └──────────────────┘  │ │
│  └────────────────────────┘ │
└─────────────────────────────┘
```

## Common Issues & Solutions

### "dotnet: command not found"
- Install .NET 8.0 SDK from https://dotnet.microsoft.com/download
- Restart your terminal/PowerShell after installation

### "WebView2 not found"
- Install WebView2 Runtime from https://developer.microsoft.com/microsoft-edge/webview2/
- Most Windows 10/11 systems already have it

### "Port already in use"
- The API automatically finds a free port
- Check for other applications using common ports
- Kill processes: `Get-Process | Where-Object {$_.ProcessName -like "*CodePilot*"} | Stop-Process`

### "Next.js build failed"
- Ensure Node.js 18+ is installed
- Run `npm install` manually
- Check for npm errors in the output

### "Cannot find CodePilot.Api.dll"
- Ensure you built the solution: `dotnet build`
- Check that `CodePilot.Api/bin/` contains the DLL
- Try cleaning and rebuilding: `dotnet clean && dotnet build`

## Development Workflow

### Making Changes to Frontend (TypeScript/React)
```powershell
# 1. Edit files in src/
# 2. Rebuild Next.js
npm run build

# 3. Copy to API wwwroot (or use build.ps1)
# 4. Restart the application
```

### Making Changes to Backend (C#)
```powershell
# 1. Edit files in CodePilot.Api/
# 2. Rebuild .NET
dotnet build

# 3. Restart the application
dotnet run --project CodePilot.Desktop\CodePilot.Desktop.csproj
```

### Making Changes to WPF (C# XAML)
```powershell
# 1. Edit files in CodePilot.Desktop/
# 2. Rebuild .NET
dotnet build

# 3. Run the application
dotnet run --project CodePilot.Desktop\CodePilot.Desktop.csproj
```

## Using Visual Studio

1. Open `CodePilot.sln` in Visual Studio 2022
2. Set `CodePilot.Desktop` as the startup project
3. Press F5 to build and run
4. Debugger attaches to WPF application
5. For API debugging, attach to the spawned `dotnet.exe` process

## Database Location

The SQLite database is stored at:
```
%USERPROFILE%\.codepilot\codepilot.db
```

On Windows, this is typically:
```
C:\Users\YourUsername\.codepilot\codepilot.db
```

You can view/edit it with tools like:
- DB Browser for SQLite
- SQLite Studio
- Visual Studio SQLite extension

## API Endpoints

The Blazor API exposes these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/chat/sessions` | GET, POST | Session management |
| `/api/chat/sessions/{id}` | GET, DELETE | Session details |
| `/api/chat/sessions/{id}/messages` | GET | Message history |
| `/api/chat` | POST | Send chat message (SSE stream) |
| `/api/settings` | GET, PUT | Settings management |
| `/api/settings/app` | GET, PUT | App settings |
| `/api/tasks` | GET, POST | Task management |
| `/api/tasks/{id}` | PUT, DELETE | Task operations |
| `/api/files/browse` | GET | Browse filesystem |
| `/api/files/preview` | POST | Preview file |
| `/api/copilot-status` | GET | Copilot connection status |

## Testing the API

You can test the API directly:

```powershell
# Start the API in standalone mode
dotnet run --project CodePilot.Api\CodePilot.Api.csproj --urls=http://localhost:5000

# In another terminal, test endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/chat/sessions
```

Or use the Swagger UI (in development mode):
```
http://localhost:5000/swagger
```

## Production Deployment

### Creating a Release Package

```powershell
# Run the publish script
.\publish.ps1

# Output will be in:
# release\win-x64\CodePilot.exe (and dependencies)
```

### Distribution Options

1. **Zip Archive**
   - Zip the `release\win-x64\` folder
   - Users extract and run `CodePilot.exe`

2. **Installer (Recommended)**
   - Use Inno Setup: https://jrsoftware.org/isinfo.php
   - Use WiX Toolset: https://wixtoolset.org/
   - Create MSI or Setup.exe

3. **Self-Contained**
   - Already included in publish.ps1
   - No .NET runtime installation required
   - Larger file size (~150MB)

## Troubleshooting Checklist

- [ ] .NET 8.0 SDK installed?
- [ ] Node.js 18+ installed?
- [ ] WebView2 Runtime installed?
- [ ] Run `dotnet --version` - should show 8.0.x
- [ ] Run `node --version` - should show v18.x or higher
- [ ] Run `npm --version` - should show 9.x or higher
- [ ] No firewall blocking localhost connections?
- [ ] No antivirus blocking the application?
- [ ] Disk space available for build artifacts?

## Getting Help

If you encounter issues:

1. Check `WPF_IMPLEMENTATION_STATUS.md` for known limitations
2. Review `MIGRATION_WPF.md` for architecture details
3. Check console output for error messages
4. Open an issue on GitHub with:
   - Error message
   - Build output
   - System information (Windows version, .NET version)

## Next Steps

After getting the application running:

1. Review `WPF_IMPLEMENTATION_STATUS.md` for implementation status
2. Check `MIGRATION_WPF.md` for architecture details
3. Explore the codebase and make modifications
4. Implement GitHub Copilot SDK integration (see status doc)

---

**Version**: 0.2.3
**Last Updated**: 2026-02-09
**Platform**: Windows only (WPF)
