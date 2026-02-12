# Windows Build Instructions

This document explains how to build CWorker for Windows using the provided PowerShell script.

## Prerequisites

Before building, ensure you have the following installed:

1. **Node.js** (v18 or later)
   - Download from https://nodejs.org/
   - Verify: `node --version`

2. **npm** (comes with Node.js)
   - Verify: `npm --version`

3. **Rust** (required for Tauri)
   - Download from https://rustup.rs/
   - Follow the installation instructions
   - Verify: `rustc --version` and `cargo --version`

4. **Visual Studio Build Tools** (Windows only)
   - Download from https://visualstudio.microsoft.com/downloads/
   - Install "Desktop development with C++" workload
   - Or install Build Tools standalone

## Quick Start

### 1. Install Dependencies

```powershell
npm install
```

### 2. Build the Application

```powershell
# Standard release build
.\build.ps1

# Clean build (removes previous builds first)
.\build.ps1 -Clean

# Debug build (faster, includes debug symbols)
.\build.ps1 -Debug
```

### 3. Run the Application

After building, the executable will be located at:
- Release: `src-tauri\target\release\CWorker.exe`
- Debug: `src-tauri\target\debug\CWorker.exe`

Simply double-click the executable or run it from the command line:
```powershell
.\src-tauri\target\release\CWorker.exe
```

**Note**: Node.js must be installed on the system as CWorker starts an embedded Next.js server on launch.

## Build Script

### build.ps1

Main build script that compiles the complete CWorker application with embedded Next.js server.

**Usage:**
```powershell
.\build.ps1 [options]
```

**Options:**
- `-Clean` - Remove previous builds before building
- `-Debug` - Build in debug mode (faster compilation, larger binary)

**Examples:**
```powershell
# Standard release build
.\build.ps1

# Clean release build
.\build.ps1 -Clean

# Debug build for development
.\build.ps1 -Debug

# Clean debug build
.\build.ps1 -Clean -Debug
```

**What it does:**
1. Checks that Node.js, npm, Rust, and Cargo are installed
2. Optionally cleans previous build artifacts
3. Installs npm dependencies if needed
4. Builds the Next.js application in standalone mode
5. Prepares the Next.js server files for bundling
6. Builds the Tauri Windows executable with embedded server
7. Reports the location and size of build artifacts
- `-Version <string>` - Specify version (default: from package.json)
- `-SkipBuild` - Skip the build step (use existing build)

## Build Output

After a successful build, you will find:

### Release Build Output
```
src-tauri/
└── target/
    └── release/
        ├── CWorker.exe          # Main executable (embedded server)
        └── bundle/
            ├── msi/
            │   └── CWorker_{version}_x64_en-US.msi  # MSI installer
            └── nsis/
                └── CWorker_{version}_x64-setup.exe   # NSIS installer
```

### Embedded Components

The built executable includes:
- Tauri runtime (Rust-based)
- Next.js server files (in resources/server/)
- Static assets (CSS, JS, images)

**Important**: The executable starts a Node.js process on launch to run the Next.js server, so Node.js must be installed on the target system.

## Build Configuration

### Tauri Configuration

The Tauri configuration is located at `src-tauri/tauri.conf.json`.

**Key settings:**
- **productName**: "CWorker"
- **version**: "0.8.0" (should match package.json)
- **identifier**: "com.cworker.app"
- **window size**: 1280x860
- **bundle targets**: MSI, NSIS
- **resources**: Includes the embedded Next.js server files

### Next.js Configuration

The Next.js configuration is in `next.config.ts`.

**Key settings:**
- **output**: "standalone" - Generates optimized server bundle
- **images.unoptimized**: true - Required for Tauri bundling

## Troubleshooting

### Build fails with "Rust is not installed"

Install Rust from https://rustup.rs/ and restart your terminal.

### Build fails with linking errors

Install Visual Studio Build Tools with C++ development workload.

### "Cannot find module" errors

Run `npm install` to ensure all dependencies are installed.

### Next.js build fails

1. Delete `.next` directory
2. Run `.\build.ps1 -Clean`

### Tauri build fails

1. Delete `src-tauri/target` directory
2. Run `.\build.ps1 -Clean`
3. Check that Rust is properly installed: `cargo --version`

### Build succeeds but exe doesn't run

1. Ensure Node.js is installed on the target system
2. Check for antivirus software blocking the executable
3. Try building with `-Debug` flag to see detailed error messages
4. Check that port 3002 is not already in use

### "Server startup timeout" error

The embedded Next.js server failed to start within 30 seconds. This could be due to:
- Antivirus blocking Node.js
- Port 3002 is already in use
- Node.js is not installed or not in PATH

## Development Workflow

### During Development

```powershell
# Run in development mode (hot reload)
npm run tauri:dev
```

This starts:
1. Next.js dev server on http://localhost:3002
2. Tauri window that loads from the dev server
3. Hot reload for both frontend and backend changes

### Production Build

```powershell
# 1. Update version in package.json and src-tauri/tauri.conf.json
# 2. Run full build
.\build.ps1 -Clean

# 3. Test the executable
.\src-tauri\target\release\CWorker.exe

# 4. Installers are in: src-tauri\target\release\bundle\
```

## Continuous Integration

For automated builds in CI/CD:

```yaml
# Example GitHub Actions workflow
steps:
  - name: Install dependencies
    run: npm ci

  - name: Install Rust
    uses: actions-rs/toolchain@v1
    with:
      toolchain: stable

  - name: Build application
    run: .\build.ps1 -Clean
    shell: pwsh

  - name: Upload artifacts
    uses: actions/upload-artifact@v3
    with:
      name: CWorker-Windows
      path: |
        src-tauri/target/release/CWorker.exe
        src-tauri/target/release/bundle/**/*
```

## File Sizes

Approximate sizes for reference:

- **Standalone .exe**: ~20-30 MB (release), ~60-100 MB (debug)
- **MSI installer**: ~25-35 MB
- **NSIS installer**: ~20-30 MB
- **Embedded server files**: ~10-15 MB (included in exe)

Debug builds are significantly larger due to debug symbols and lack of optimization.

## Additional Resources

- [Tauri Documentation](https://tauri.app/v2/guides/)
- [Next.js Standalone Output](https://nextjs.org/docs/app/api-reference/next-config-js/output)
- [Rust Installation](https://www.rust-lang.org/tools/install)

## Support

For build issues or questions:
- Check the [GitHub Issues](https://github.com/op7418/CWorker/issues)
- Create a new issue with:
  - Build command used
  - Error messages
  - System information (Windows version, Node version, Rust version)
