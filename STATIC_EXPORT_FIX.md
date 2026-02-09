# Static Export Fix Documentation

## Problem Summary

The WPF MainWindow was displaying a placeholder `index.html` instead of the actual Next.js application.

## Root Cause

1. **Wrong Next.js Output Mode**: Next.js was configured for `standalone` mode, which creates a Node.js server bundle instead of static files
2. **Incomplete File Copying**: Build scripts only copied `_next/static` and `public` directories, missing the actual HTML pages
3. **Missing Static Files**: Blazor API's wwwroot directory didn't contain the complete Next.js application

## Solution

### 1. Changed Next.js to Static Export Mode

**File**: `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  output: 'export',  // Changed from 'standalone'
  images: {
    unoptimized: true,  // Required for static export
  },
};
```

**Why Static Export?**
- Generates pure HTML/CSS/JS files
- No Node.js server required
- Perfect for Blazor API static file serving
- All backend logic handled by Blazor API

### 2. Fixed Build Scripts

**Files**: `build.ps1` and `publish.ps1`

**Before:**
```powershell
# Only copied partial files
Copy-Item -Path ".next\static" -Destination "CodePilot.Api\wwwroot\_next\"
Copy-Item -Path "public\*" -Destination "CodePilot.Api\wwwroot\"
```

**After:**
```powershell
# Clean and copy complete static export
Remove-Item -Path "CodePilot.Api\wwwroot\*" -Recurse -Force
Copy-Item -Path "out\*" -Destination "CodePilot.Api\wwwroot\" -Recurse -Force
```

## How It Works

### Build Process

1. **Next.js Build**: `npm run build`
   - Generates static export to `out/` directory
   - Contains complete website with all pages

2. **Copy to wwwroot**:
   - Clears old files from `CodePilot.Api/wwwroot`
   - Copies entire `out/` directory to wwwroot
   - Includes all HTML, JS, CSS, and assets

3. **Blazor Compilation**:
   - Builds API project with static files
   - Deploys with WPF application

### Runtime Process

1. **WPF Launch**: Desktop application starts
2. **API Server**: Blazor API starts on dynamic port
3. **WebView2 Navigation**: `http://localhost:{port}`
4. **Static File Serving**: Blazor serves from wwwroot
5. **Next.js Hydration**: Client-side app initializes
6. **Client Routing**: Navigation works within the app

## Directory Structure

### After Static Export

```
out/                          # Next.js static export output
├── index.html               # Home page
├── chat/
│   └── index.html          # Chat page
├── settings/
│   └── index.html          # Settings page
├── _next/
│   ├── static/             # JS bundles
│   │   ├── chunks/
│   │   └── css/
│   └── ...
└── favicon.ico
```

### After Copy to wwwroot

```
CodePilot.Api/wwwroot/       # Blazor static files directory
├── index.html               # ← Served at http://localhost:port/
├── chat/
│   └── index.html          # ← Served at /chat
├── settings/
│   └── index.html          # ← Served at /settings
├── _next/
│   └── static/             # ← Static assets
└── favicon.ico
```

## Testing

### Verify the Fix

```powershell
# 1. Clean previous builds
Remove-Item out, .next, CodePilot.Api\wwwroot -Recurse -Force -ErrorAction SilentlyContinue

# 2. Build
.\build.ps1

# 3. Check wwwroot contents
Get-ChildItem CodePilot.Api\wwwroot -Recurse | Select-Object FullName

# Expected output:
# - index.html
# - chat/index.html
# - settings/index.html
# - _next/static/...
```

### Run and Test

```powershell
# Run the application
.\build.ps1
# Choose 'Y' to run

# Expected behavior:
# 1. WPF window opens
# 2. Shows Next.js home page (not placeholder)
# 3. Navigation works (Home → Chat → Settings)
# 4. API calls work (sessions, status, etc.)
```

## Static Export Limitations

### What's NOT Supported

- ❌ Server-Side Rendering (SSR)
- ❌ Next.js API Routes
- ❌ Image Optimization
- ❌ Incremental Static Regeneration (ISR)
- ❌ Dynamic routes requiring SSR

### Why This Is Fine

- ✅ Blazor API handles all backend logic
- ✅ Client-side rendering is sufficient
- ✅ All API routes implemented in Blazor
- ✅ Images use unoptimized mode
- ✅ All routes are static pages

## Architecture

### Previous (Electron)
```
┌─────────────────────┐
│   Electron Shell    │
├─────────────────────┤
│  Chromium (UI)      │
│  Next.js (SSR)      │
│  Node.js (API)      │
└─────────────────────┘
```

### Current (WPF + Blazor)
```
┌─────────────────────────────┐
│       WPF Application       │
├─────────────────────────────┤
│  WebView2 (Chromium UI)     │
│  ↓ loads from ↓             │
│  Blazor API Server          │
│  ├─ Static Files (Next.js)  │
│  └─ API Endpoints (C#)      │
└─────────────────────────────┘
```

## Benefits

✅ **Simpler Architecture**: No Node.js server, just static files
✅ **Faster Builds**: Static export is quick
✅ **Smaller Bundle**: No server code in frontend
✅ **Clear Separation**: Frontend (static) vs Backend (Blazor)
✅ **Easy Deployment**: Just copy files
✅ **Better Performance**: Pre-rendered HTML

## Troubleshooting

### Issue: wwwroot is empty
**Solution**: Run `npm run build` first to generate `out/` directory

### Issue: Old placeholder still shows
**Solution**: Build script now cleans wwwroot automatically

### Issue: 404 on page refresh
**Solution**: Blazor's `MapFallbackToFile("index.html")` handles this

### Issue: API calls fail
**Solution**: Ensure CORS is configured in `Program.cs`

### Issue: Images don't load
**Solution**: Check images are in `public/` and copied correctly

## Summary

The fix changes Next.js from server-mode (`standalone`) to static export mode (`export`), and updates build scripts to copy the complete static output to Blazor's wwwroot directory. This allows the WPF + Blazor architecture to serve the Next.js application correctly without requiring a Node.js server.

The result is a fully functional Windows desktop application that combines:
- WPF for native Windows shell
- WebView2 for modern web UI
- Next.js static export for frontend
- Blazor API for backend services
