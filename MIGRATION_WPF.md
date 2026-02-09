# Migration from Electron to WPF + WebView2 + Blazor

This document describes the architectural migration from Electron to WPF + WebView2 with Blazor backend.

## New Architecture

### Display Framework
- **Container**: WPF (Windows Presentation Foundation)
- **Web Host**: WebView2 (Chromium-based)
- **UI Layer**: Next.js/React/TypeScript (unchanged)

### Backend Framework
- **API Server**: ASP.NET Core Blazor Web API
- **Database**: SQLite via Entity Framework Core
- **Language**: C# (.NET 8.0)

## Project Structure

```
CodePilot/
├── CodePilot.Desktop/          # WPF Application
│   ├── App.xaml                # WPF Application entry
│   ├── MainWindow.xaml         # Main window with WebView2
│   ├── ApiServer.cs            # Launches Blazor API
│   └── CodePilot.Desktop.csproj
│
├── CodePilot.Api/              # Blazor Web API
│   ├── Controllers/            # API Controllers
│   ├── Data/                   # Database context and models
│   ├── wwwroot/                # Next.js static files
│   ├── Program.cs              # API entry point
│   └── CodePilot.Api.csproj
│
├── src/                        # Next.js/React frontend (unchanged)
├── CodePilot.sln               # Visual Studio solution
├── build.ps1                   # Build script for WPF
└── publish.ps1                 # Publish script for WPF
```

## Prerequisites

### Development
- .NET 8.0 SDK or higher
- Node.js 18 or higher
- Visual Studio 2022 (optional, for IDE)
- WebView2 Runtime (usually pre-installed on Windows 10/11)

### Runtime (End Users)
- Windows 10/11
- WebView2 Runtime
- .NET 8.0 Runtime (if not self-contained)

## Building the Application

### Development Build

```powershell
# Run the build script
.\build.ps1

# Or manually:
# 1. Build Next.js
npm install
npm run build

# 2. Build .NET solution
dotnet restore
dotnet build CodePilot.sln
```

### Running in Development

```powershell
# Option 1: Use build script
.\build.ps1
# When prompted, choose 'Y' to run

# Option 2: Run manually
dotnet run --project CodePilot.Desktop\CodePilot.Desktop.csproj
```

### Production Build

```powershell
# Run the publish script
.\publish.ps1

# Output will be in: release\win-x64\
```

## Key Differences from Electron

### What Changed

1. **Container**: Electron → WPF + WebView2
   - Windows-only (no macOS/Linux support)
   - Native Windows integration
   - Better performance on Windows

2. **Backend**: Node.js → ASP.NET Core Blazor
   - All API endpoints ported to C#
   - Entity Framework Core instead of better-sqlite3
   - ASP.NET Core middleware instead of Express

3. **Build System**: npm scripts → dotnet + npm
   - WPF compilation via MSBuild/dotnet
   - Next.js still built with npm

### What Stayed the Same

1. **Frontend**: Next.js/React/TypeScript
   - No changes to React components
   - Same UI/UX
   - Same API contract

2. **Database Schema**: SQLite
   - Same database structure
   - Same data models
   - Backward compatible with existing databases

## API Migration

The Node.js API routes have been ported to C# controllers:

| Node.js Route | C# Controller |
|---------------|---------------|
| `/api/health` | Minimal API endpoint |
| `/api/settings` | `SettingsController` |
| `/api/chat` | `ChatController` (to be implemented) |
| `/api/sessions` | `SessionsController` (to be implemented) |

## Database Migration

The database layer has been migrated:

- **Old**: better-sqlite3 (Node.js native module)
- **New**: Entity Framework Core with SQLite provider
- **Location**: `~/.codepilot/codepilot.db` (same as before)

## WebView2 Integration

The WPF application uses Microsoft WebView2 control:

```csharp
// WebView2 initialization
await webView.EnsureCoreWebView2Async();

// Navigate to Blazor API server
webView.Source = new Uri($"http://localhost:{port}");
```

## Deployment

### Self-Contained Deployment
```powershell
dotnet publish CodePilot.Desktop\CodePilot.Desktop.csproj `
    --configuration Release `
    --runtime win-x64 `
    --self-contained true `
    --output release\win-x64 `
    /p:PublishSingleFile=true
```

### Framework-Dependent Deployment
Requires .NET 8.0 Runtime on target machine:
```powershell
dotnet publish CodePilot.Desktop\CodePilot.Desktop.csproj `
    --configuration Release `
    --runtime win-x64 `
    --self-contained false `
    --output release\win-x64
```

## Creating an Installer

Use tools like:
- **Inno Setup**: Free, script-based installer
- **WiX Toolset**: MSI-based installer
- **Advanced Installer**: GUI-based commercial tool

## Troubleshooting

### WebView2 Not Found
Install WebView2 Runtime from:
https://developer.microsoft.com/en-us/microsoft-edge/webview2/

### .NET SDK Not Found
Install .NET 8.0 SDK from:
https://dotnet.microsoft.com/download

### Port Already in Use
The API server finds a free port automatically. If issues persist, check for:
```powershell
netstat -ano | findstr :3000
```

## Migration Benefits

1. **Native Windows Integration**: Better Windows 10/11 experience
2. **Performance**: Native compilation, faster startup
3. **Smaller Runtime**: No Electron overhead
4. **Type Safety**: C# backend with strong typing
5. **Modern .NET**: Access to .NET ecosystem

## Migration Drawbacks

1. **Windows Only**: No macOS/Linux support
2. **Two Runtimes**: Requires both .NET and Node.js for build
3. **Learning Curve**: Team needs C# knowledge
4. **WebView2 Dependency**: Requires WebView2 Runtime

## Future Enhancements

- Implement all remaining API endpoints in C#
- Add GitHub Copilot SDK integration in C#
- Create MSI installer
- Add auto-update functionality
- Optimize bundle size

## Support

For issues or questions:
- GitHub Issues: https://github.com/BenHao-WTG/CodePilot/issues
- Documentation: See README.md
