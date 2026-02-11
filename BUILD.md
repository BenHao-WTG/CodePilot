# Windows Build Instructions

This document explains how to build CodePilot for Windows using the provided PowerShell scripts.

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
- Release: `src-tauri\target\release\codepilot.exe`
- Debug: `src-tauri\target\debug\codepilot.exe`

## Build Scripts

### build.ps1

Main build script that compiles the application.

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
4. Builds the Next.js frontend (static export to `out/` directory)
5. Builds the Tauri Windows executable
6. Reports the location and size of build artifacts

### publish.ps1

Release preparation script that builds and packages the application for distribution.

**Usage:**
```powershell
.\publish.ps1 [options]
```

**Options:**
- `-Version <string>` - Specify version (default: from package.json)
- `-SkipBuild` - Skip the build step (use existing build)
- `-OutputDir <string>` - Output directory (default: "release")

**Examples:**
```powershell
# Publish with version from package.json
.\publish.ps1

# Publish specific version
.\publish.ps1 -Version "1.0.0"

# Publish without rebuilding
.\publish.ps1 -SkipBuild

# Publish to custom directory
.\publish.ps1 -OutputDir "dist"
```

**What it does:**
1. Runs build.ps1 to compile the application (unless -SkipBuild is used)
2. Creates a versioned release directory
3. Copies executables and installers with versioned names
4. Generates SHA256 checksums for all artifacts
5. Creates a README.txt with installation instructions
6. Provides next steps for creating a GitHub release

**Output structure:**
```
release/
├── CodePilot-0.8.0-windows.exe          # Standalone executable
├── CodePilot-0.8.0-windows-installer.msi # MSI installer
├── CodePilot-0.8.0-windows-setup.exe    # NSIS installer (if configured)
├── README.txt                            # Installation guide
└── SHA256SUMS.txt                        # Checksums
```

## Build Configuration

### Tauri Configuration

The Tauri configuration is located at `src-tauri/tauri.conf.json`.

**Key settings:**
- **productName**: "CodePilot"
- **version**: "0.8.0" (should match package.json)
- **identifier**: "com.codepilot.app"
- **window size**: 1280x860
- **bundle targets**: MSI, NSIS

To change the bundle format, edit the `bundle.targets` field.

### Next.js Configuration

The Next.js configuration is in `next.config.ts`.

**Key settings:**
- **output**: "export" - Generates static files for Tauri
- **images.unoptimized**: true - Required for static export

## Troubleshooting

### Build fails with "Rust is not installed"

Install Rust from https://rustup.rs/ and restart your terminal.

### Build fails with linking errors

Install Visual Studio Build Tools with C++ development workload.

### "Cannot find module" errors

Run `npm install` to ensure all dependencies are installed.

### Next.js build fails

1. Delete `.next` and `out` directories
2. Run `.\build.ps1 -Clean`

### Tauri build fails

1. Delete `src-tauri/target` directory
2. Run `.\build.ps1 -Clean`
3. Check that Rust is properly installed: `cargo --version`

### Build succeeds but exe doesn't run

1. Check for antivirus software blocking the executable
2. Try building with `-Debug` flag to see detailed error messages
3. Ensure all dependencies are installed

## Development Workflow

### During Development

```powershell
# Run in development mode (hot reload)
npm run tauri:dev
```

This starts:
1. Next.js dev server on http://localhost:3000
2. Tauri window that loads from the dev server
3. Hot reload for both frontend and backend changes

### Before Release

```powershell
# 1. Update version in package.json
# 2. Update version in src-tauri/tauri.conf.json
# 3. Build and publish
.\publish.ps1 -Version "1.0.0"
```

## Continuous Integration

For automated builds in CI/CD:

```powershell
# Install dependencies
npm ci

# Build
.\build.ps1 -Clean

# Publish (if on release tag)
if ($env:GITHUB_REF -match 'refs/tags/v(.*)') {
    $version = $matches[1]
    .\publish.ps1 -Version $version -SkipBuild
}
```

## File Sizes

Approximate sizes for reference:

- **Standalone .exe**: ~15-20 MB (release), ~50-80 MB (debug)
- **MSI installer**: ~20-25 MB
- **NSIS installer**: ~15-20 MB

Debug builds are significantly larger due to debug symbols and lack of optimization.

## Additional Resources

- [Tauri Documentation](https://tauri.app/v2/guides/)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Rust Installation](https://www.rust-lang.org/tools/install)

## Support

For build issues or questions:
- Check the [GitHub Issues](https://github.com/BenHao-WTG/CodePilot/issues)
- Create a new issue with:
  - Build command used
  - Error messages
  - System information (Windows version, Node version, Rust version)
