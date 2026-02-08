# Migration Guide: Claude SDK to GitHub Copilot SDK

This document explains how to migrate from the Claude Code integration to GitHub Copilot.

## Prerequisites

### Uninstall Claude Code CLI (if you have it)

If you previously had Claude Code CLI installed, you can optionally uninstall it:

```bash
npm uninstall -g @anthropic-ai/claude-code
```

### Install GitHub Copilot CLI

You need to install and authenticate with the GitHub Copilot CLI:

```bash
# Install the Copilot CLI
npm install -g @github/copilot-cli

# Authenticate with GitHub
copilot auth

# Verify installation
copilot --version
```

## Configuration Changes

### Authentication

**Before (Claude):**
- Authentication via `claude login`
- API token stored in `~/.claude/` directory
- Settings in `~/.claude/settings.json`

**After (Copilot):**
- Authentication via `copilot auth`
- GitHub token used for authentication
- Settings support both `~/.copilot/` and `~/.claude/` directories (for backward compatibility)

### Settings Migration

Your existing settings will continue to work. The app checks both directories:
1. `~/.copilot/` (preferred)
2. `~/.claude/` (backward compatibility)

If you want to migrate your settings manually:

```bash
# Create the new directory
mkdir -p ~/.copilot

# Copy your settings (optional)
cp ~/.claude/settings.json ~/.copilot/settings.json

# Copy your commands/skills (optional)
cp -r ~/.claude/commands ~/.copilot/commands
```

### GitHub Token Configuration

You can set your GitHub token in the app settings:

1. Open CodePilot
2. Go to Settings
3. Add `github_token` setting with your GitHub token

Or set it as an environment variable:

```bash
export GITHUB_TOKEN=your_github_token_here
```

## API Changes

### Model Names

**Before (Claude):**
- `claude-3-5-sonnet-20241022`
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`

**After (Copilot):**
- `gpt-4`
- `gpt-3.5-turbo`
- Other OpenAI models supported by Copilot

Update your model selections in:
1. Session settings
2. Default model in Settings
3. Any saved configurations

## What Stays the Same

### Database
- All your chat history is preserved
- Session data remains intact
- No database migration needed

### Features
- All chat functionality works the same
- MCP server integration continues to work
- Custom skills/commands still supported
- Permission system unchanged
- Project context awareness unchanged

### UI
- Interface remains the same
- All keyboard shortcuts work
- Theme settings preserved

## Troubleshooting

### "GitHub Copilot Not Connected" Error

1. Verify Copilot CLI is installed:
   ```bash
   copilot --version
   ```

2. Check authentication:
   ```bash
   copilot auth status
   ```

3. Re-authenticate if needed:
   ```bash
   copilot auth
   ```

### Binary Not Found

The app searches for the `copilot` binary in:
- `/usr/local/bin/copilot`
- `/opt/homebrew/bin/copilot`
- `~/.npm-global/bin/copilot`
- `~/.local/bin/copilot`
- `~/.copilot/bin/copilot`

Ensure your installation is in one of these paths or in your `PATH`.

### Settings Not Loading

If your settings aren't loading:

1. Check both directories:
   ```bash
   ls -la ~/.copilot/
   ls -la ~/.claude/
   ```

2. Verify settings.json format:
   ```bash
   cat ~/.copilot/settings.json
   # or
   cat ~/.claude/settings.json
   ```

3. The settings file should be valid JSON

## Rolling Back (If Needed)

If you need to roll back to the Claude version:

1. Checkout the previous version:
   ```bash
   git checkout <previous-commit>
   npm install
   ```

2. Your data is safe - the database format hasn't changed

## Getting Help

If you encounter issues:

1. Check the [GitHub Issues](https://github.com/op7418/CodePilot/issues)
2. Review the README.md for updated documentation
3. Open a new issue with details about your problem

## Technical Notes

### Code Changes

The migration includes:

- **Backend**: New `copilot-client.ts` using `@github/copilot-sdk`
- **API**: New `/api/copilot-status` endpoint
- **Platform**: Binary detection for Copilot CLI
- **Types**: SDK-agnostic permission types
- **UI**: Updated branding and text

### Backward Compatibility

The following are maintained for backward compatibility:

- Type aliases (`ClaudeStreamOptions`)
- Function exports (`streamClaude`)
- Config directory fallbacks (`.claude`)
- Database schema (unchanged)
- SSE event format (identical)

This ensures a smooth migration with minimal disruption.
