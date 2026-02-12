<img src="docs/icon-readme.png" width="32" height="32" alt="CWorker" style="vertical-align: middle; margin-right: 8px;" /> CWorker
===

**A native desktop GUI for GitHub Copilot** -- chat, code, and manage projects through a polished visual interface powered by the GitHub Copilot SDK.

[![GitHub release](https://img.shields.io/github/v/release/op7418/CWorker)](https://github.com/op7418/CWorker/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)](https://github.com/op7418/CWorker/releases)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[中文文档](./README_CN.md) | [日本語](./README_JA.md)

---

## Features

- **💬 Conversational coding** -- Stream responses from GitHub Copilot in real time with full Markdown rendering, syntax-highlighted code blocks, and tool-call visualization.
- **📂 Session management** -- Create, rename, archive, and resume chat sessions. Conversations are persisted locally in SQLite so nothing is lost between restarts.
- **🎯 Project-aware context** -- Pick a working directory per session. The right panel shows a live file tree and file previews so you always know what Copilot is looking at.
- **🔒 Permission controls** -- Approve, deny, or auto-allow tool use on a per-action basis. Choose between permission modes to match your comfort level.
- **🎭 Multiple interaction modes** -- Switch between *Code*, *Plan*, and *Ask* modes to control how Copilot behaves in each session.
- **🤖 Model selector** -- Switch between available models (GPT-5, Claude Sonnet, etc.) mid-conversation.
- **🔌 MCP server management** -- Add, configure, and remove Model Context Protocol servers directly from the Extensions page. Supports `stdio`, `sse`, and `http` transport types.
- **⚡ Custom skills** -- Define reusable prompt-based skills (global or per-project) that can be invoked as slash commands during chat.
- **⚙️ Settings editor** -- Configure your GitHub token and API providers directly in the app.
- **📊 Token usage tracking** -- See input/output token counts and estimated cost after every assistant response.
- **🌗 Dark / Light theme** -- One-click theme toggle in the navigation rail.
- **⌨️ Slash commands** -- Built-in commands like `/help`, `/clear`, `/cost`, `/compact`, `/doctor`, `/review`, and more.
- **🖥️ Desktop application** -- Built with Tauri for a lightweight, secure, and cross-platform desktop experience.

---

## Screenshots

![CWorker](docs/screenshot.png)

---

## Prerequisites

> **Important**: CWorker uses the GitHub Copilot SDK. You need a GitHub token with Copilot access.

### For Users (Pre-built Releases)

| Requirement | Minimum version |
|---|---|
| **Windows** | Windows 10 or later |
| **GitHub Token** | Personal access token or GitHub Copilot subscription |

### For Developers (Building from Source)

| Requirement | Minimum version |
|---|---|
| **Node.js** | 18+ |
| **Rust** | Latest stable (install from https://rustup.rs/) |
| **GitHub Token** | Personal access token or GitHub Copilot subscription |
| **npm** | 9+ (ships with Node 18) |

---

## Download

Pre-built releases are available on the [**Releases**](https://github.com/op7418/CWorker/releases) page.

### Supported Platforms

- **macOS**: Universal binary (arm64 + x64) distributed as `.dmg`
- **Windows**: x64 distributed as `.zip`
- **Linux**: x64 and arm64 distributed as `.AppImage`, `.deb`, and `.rpm`

---

## Quick Start

### For Users

Download the latest release from the [**Releases**](https://github.com/op7418/CWorker/releases) page.

**Windows:**
1. Download `CWorker-{version}-windows-installer.msi`
2. Run the installer and follow the wizard
3. Launch CWorker from the Start Menu

### For Developers

```bash
# Clone the repository
git clone https://github.com/op7418/CWorker.git
cd CWorker

# Install dependencies
npm install

# Start in development mode
npm run tauri:dev
```

This will start the Next.js dev server and launch the Tauri application window.

### Building for Windows

See [BUILD.md](BUILD.md) for detailed build instructions.

**Quick build:**
```powershell
# Standard release build
.\build.ps1

# Clean build (removes all previous build artifacts)
.\build.ps1 -Clean

# Debug build
.\build.ps1 -Debug
```

After building, run the application directly:
```powershell
# Run the built executable
.\src-tauri\target\release\CWorker.exe
```

**Note**: The executable requires Node.js to be installed on the system as it starts an embedded Next.js server.

---

## Installation Troubleshooting

CWorker is not code-signed yet, so your operating system will display a security warning the first time you open it.

### macOS

You will see a dialog that says **"Apple cannot check it for malicious software"**.

**Option 1 -- Right-click to open**

1. Right-click (or Control-click) `CWorker.app` in Finder.
2. Select **Open** from the context menu.
3. Click **Open** in the confirmation dialog.

**Option 2 -- System Settings**

1. Open **System Settings** > **Privacy & Security**.
2. Scroll down to the **Security** section.
3. You will see a message about CWorker being blocked. Click **Open Anyway**.
4. Authenticate if prompted, then launch the app.

**Option 3 -- Terminal command**

```bash
xattr -cr /Applications/CWorker.app
```

This strips the quarantine attribute so macOS will no longer block the app.

### Windows

Windows SmartScreen will block the installer or executable.

**Option 1 -- Run anyway**

1. On the SmartScreen dialog, click **More info**.
2. Click **Run anyway**.

**Option 2 -- Disable App Install Control**

1. Open **Settings** > **Apps** > **Advanced app settings**.
2. Toggle **App Install Control** (or "Choose where to get apps") to allow apps from anywhere.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (Static Export) |
| Desktop shell | [Tauri 2.0](https://tauri.app/) |
| UI components | [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Animation | [Motion](https://motion.dev/) (Framer Motion) |
| AI integration | [GitHub Copilot SDK](https://github.com/github/copilot-sdk) |
| Database | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (embedded, per-user) |
| Markdown | react-markdown + remark-gfm + rehype-raw + [Shiki](https://shiki.style/) |
| Streaming | Server-Sent Events (SSE) |
| Icons | [Hugeicons](https://hugeicons.com/) + [Lucide](https://lucide.dev/) |
| Build | Tauri CLI + Rust + Cargo |

---

## Project Structure

```
codepilot/
├── electron/                # Electron main process & preload
│   ├── main.ts              # Window creation, embedded server lifecycle
│   └── preload.ts           # Context bridge
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── chat/            # New-chat page & [id] session page
│   │   ├── extensions/      # Skills + MCP server management
│   │   ├── settings/        # Settings editor
│   │   └── api/             # REST + SSE endpoints
│   │       ├── chat/        # Sessions, messages, streaming, permissions
│   │       ├── files/       # File tree & preview
│   │       ├── plugins/     # Plugin & MCP CRUD
│   │       ├── settings/    # Settings read/write
│   │       ├── skills/      # Skill CRUD
│   │       └── tasks/       # Task tracking
│   ├── components/
│   │   ├── ai-elements/     # Message bubbles, code blocks, tool calls, etc.
│   │   ├── chat/            # ChatView, MessageList, MessageInput, streaming
│   │   ├── layout/          # AppShell, NavRail, Header, RightPanel
│   │   ├── plugins/         # MCP server list & editor
│   │   ├── project/         # FileTree, FilePreview, TaskList
│   │   ├── skills/          # SkillsManager, SkillEditor
│   │   └── ui/              # Radix-based primitives (button, dialog, tabs, ...)
│   ├── hooks/               # Custom React hooks (usePanel, ...)
│   ├── lib/                 # Core logic
│   │   ├── claude-client.ts # Agent SDK streaming wrapper
│   │   ├── db.ts            # SQLite schema, migrations, CRUD
│   │   ├── files.ts         # File system helpers
│   │   ├── permission-registry.ts  # Permission request/response bridge
│   │   └── utils.ts         # Shared utilities
│   └── types/               # TypeScript interfaces & API contracts
├── electron-builder.yml     # Packaging configuration
├── package.json
└── tsconfig.json
```

---

## Development

```bash
# Run Next.js dev server only (opens in browser)
npm run dev

# Run the Tauri app in dev mode with hot reload
npm run tauri:dev

# Production build (Next.js static export)
npm run build

# Build Tauri Windows executable
npm run tauri:build

# Or use PowerShell scripts (Windows)
.\build.ps1          # Build release
.\build.ps1 -Debug   # Build debug version
.\publish.ps1        # Create release package
```

### Notes

- The Tauri app loads the Next.js static export from the `out/` directory in production mode.
- In dev mode, it connects to the Next.js dev server at `http://localhost:3000`.
- Chat data is stored in `~/.cworker/cworker.db` (or `./data/cworker.db` in dev mode).
- The app uses WAL mode for SQLite, so concurrent reads are fast.
- For detailed build instructions, see [BUILD.md](BUILD.md).

---

## Contributing

Contributions are welcome. To get started:

1. Fork the repository and create a feature branch.
2. Install dependencies with `npm install`.
3. Run `npm run tauri:dev` to test your changes locally.
4. Make sure `npm run lint` passes before opening a pull request.
5. Open a PR against `main` with a clear description of what changed and why.

Please keep PRs focused -- one feature or fix per pull request.

---

## License

MIT
