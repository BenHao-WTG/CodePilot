# Migration Guide: Claude Code → GitHub Copilot

This guide explains the changes made in migrating CodePilot from Claude Code Agent SDK to GitHub Copilot SDK.

## Summary of Changes

### 1. AI Backend Migration

**From:** Anthropic's Claude Code Agent SDK
**To:** GitHub Copilot SDK

The application now uses the GitHub Copilot SDK (`@github/copilot-sdk`) instead of the Claude Agent SDK for all AI interactions.

### 2. Authentication Changes

**Before:**
- Required Claude Code CLI to be installed
- Used `claude login` for authentication
- API key: `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN`
- Base URL: `ANTHROPIC_BASE_URL`

**After:**
- No CLI installation required (SDK is bundled)
- GitHub token for authentication
- API key: `GITHUB_TOKEN` or configured in Settings
- Direct SDK integration

### 3. Configuration Changes

#### Settings UI
- **Provider Type:** Changed from "Anthropic", "OpenRouter", etc. to "GitHub Copilot", "Custom"
- **API Key Field:** Renamed from "Anthropic API Key" to "GitHub Token"
- **Quick Presets:** Simplified to GitHub Copilot and GitHub Enterprise options

#### Database
- Existing data is fully compatible
- Provider type defaults updated but existing records unchanged
- No migration required for existing users

### 4. Removed Features

- **CLI Session Import:** The "Import from Claude Code CLI" feature is disabled as it's specific to Claude's CLI tool
- **Claude Status Check:** The `/api/claude-status` endpoint removed
- **Claude Sessions API:** The `/api/claude-sessions` endpoints removed

### 5. Updated Features

#### Model Selection
- Now supports GitHub Copilot's model routing
- Available models: GPT-5, Claude Sonnet 4.5, and other Copilot-supported models
- Model selection works the same way in the UI

#### MCP Servers
- Model Context Protocol (MCP) server support maintained
- Same configuration interface (stdio, SSE, HTTP)
- Compatible with Copilot SDK's MCP implementation

#### Streaming
- Chat streaming continues to work identically
- Uses Server-Sent Events (SSE)
- Real-time tool execution and progress updates

## For Users

### What You Need to Do

1. **Get a GitHub Token**
   - Visit [GitHub Settings → Tokens](https://github.com/settings/tokens)
   - Create a personal access token with Copilot access
   - Or ensure you have a GitHub Copilot subscription

2. **Configure in Settings**
   - Open CodePilot
   - Go to Settings → Providers
   - Add a new provider or update existing one
   - Enter your GitHub token
   - Activate the provider

3. **Optional: Environment Variable**
   - Set `GITHUB_TOKEN` environment variable
   - CodePilot will use it automatically

### What Stays the Same

- **All UI features** work identically
- **Session management** unchanged
- **File operations** and project context
- **Permission controls** for tool use
- **Dark/Light themes**
- **Slash commands**
- **Custom skills**
- **MCP server extensions**

### What's Different

- **No CLI required** - Copilot SDK is bundled
- **GitHub authentication** instead of Anthropic
- **Model names** may differ based on Copilot's routing
- **Session import** from CLI not available

## For Developers

### API Changes

#### Core Client
```typescript
// Before (Claude SDK)
import { query } from '@anthropic-ai/claude-agent-sdk';

// After (Copilot SDK)
import { CopilotClient } from '@github/copilot-sdk';
const client = new CopilotClient();
await client.start();
const session = await client.createSession({ model: 'gpt-5' });
```

#### Permissions
```typescript
// Before (Claude SDK)
interface PermissionResult {
  behavior: 'allow' | 'deny';
  message?: string;
  updatedInput?: Record<string, unknown>;
}

// After (Copilot SDK)
interface PermissionResult {
  allow: boolean;
  updatedInput?: Record<string, unknown>;
}
```

#### MCP Configuration
```typescript
// Before (Claude SDK) - Array format
const mcpServers: MCPServerConfig[] = [
  { type: 'local', name: 'server1', command: 'node', args: ['server.js'] }
];

// After (Copilot SDK) - Record format
const mcpServers: Record<string, MCPServerConfig> = {
  'server1': { type: 'local', command: 'node', args: ['server.js'], tools: ['*'] }
};
```

#### Event Listeners
```typescript
// Before (Claude SDK)
session.on('tool.execution_end', (event) => { ... });

// After (Copilot SDK)
session.on('tool.execution_complete', (event) => { ... });
session.on('tool.execution_partial_result', (event) => { ... });
```

### File Structure

#### Added Files
- `src/lib/copilot-client.ts` - New Copilot SDK client
- `COPILOT.md` - Project documentation (renamed from CLAUDE.md)
- `src-tauri/` - Tauri project structure (future use)

#### Removed Files
- `src/lib/claude-client.ts` - Old Claude SDK client
- `src/lib/claude-session-parser.ts` - Claude CLI session parser
- `src/app/api/claude-status/` - Claude CLI status check
- `src/app/api/claude-sessions/` - Claude CLI session import
- `CLAUDE.md` - Renamed to COPILOT.md

#### Modified Files
- `src/app/api/chat/route.ts` - Uses `streamCopilot` instead of `streamClaude`
- `src/lib/permission-registry.ts` - Updated permission types
- `src/app/api/chat/permission/route.ts` - Simplified permission handling
- `src/components/settings/ProviderForm.tsx` - GitHub token UI
- `src/components/settings/ProviderManager.tsx` - Updated presets
- `src/components/layout/ConnectionStatus.tsx` - Token-based status check
- `src/components/layout/ImportSessionDialog.tsx` - Disabled (returns null)

### Dependencies

#### Added
- `@github/copilot-sdk` - GitHub Copilot SDK

#### Removed
- `@anthropic-ai/claude-agent-sdk` - Claude Agent SDK

#### Unchanged
- `next` - Next.js framework
- `electron` - Desktop shell
- `better-sqlite3` - Database
- All UI libraries (React, Radix UI, Tailwind, etc.)

## Architecture Notes

### Desktop Framework

The application continues to use **Electron** as the desktop shell. While a Tauri migration was explored and the project structure initialized (`src-tauri/`), the full migration was deferred because:

1. GitHub Copilot SDK requires Node.js runtime
2. Full Tauri migration would require complex Node.js sidecar
3. Current Electron architecture provides stable foundation
4. Future migration possible when Rust-compatible SDK available

### Database Compatibility

The SQLite database schema remains unchanged. Existing databases will work without migration. Only new default values were updated (e.g., default provider type from "anthropic" to "github"), which doesn't affect existing data.

## Troubleshooting

### "No GitHub token found" error
- Configure a GitHub token in Settings → Providers
- Or set `GITHUB_TOKEN` environment variable
- Ensure token has Copilot access

### Build errors in development
- Run `npm install` to ensure dependencies are up to date
- Clear `.next` cache: `rm -rf .next`
- Rebuild: `npm run build`

### Permission denied errors
- Check that permission mode is set correctly
- Verify Settings → dangerously_skip_permissions if needed
- Check Copilot token has necessary permissions

## Future Enhancements

Potential future improvements:

1. **Tauri Migration:** Complete migration to Tauri when feasible
2. **Additional Model Support:** Add more model routing options
3. **Enhanced MCP:** Expand MCP server capabilities
4. **Custom Tools:** Support for custom Copilot tools
5. **Multi-Provider:** Support multiple AI providers simultaneously

## Support

For issues or questions:
- Check existing GitHub issues
- Create new issue with detailed description
- Include logs from developer console
- Mention migration from Claude if relevant

## License

Same MIT license as original CodePilot project.
