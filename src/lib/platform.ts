import { execFileSync, execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);

export const isWindows = process.platform === 'win32';
export const isMac = process.platform === 'darwin';

/**
 * Whether the given binary path requires shell execution.
 * On Windows, .cmd/.bat files cannot be executed directly by execFileSync.
 */
function needsShell(binPath: string): boolean {
  return isWindows && /\.(cmd|bat)$/i.test(binPath);
}

/**
 * Extra PATH directories to search for GitHub Copilot CLI and other tools.
 */
export function getExtraPathDirs(): string[] {
  const home = os.homedir();
  if (isWindows) {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    return [
      path.join(appData, 'npm'),
      path.join(localAppData, 'npm'),
      path.join(home, '.npm-global', 'bin'),
      path.join(home, '.copilot', 'bin'),
      path.join(home, '.local', 'bin'),
      path.join(home, '.nvm', 'current', 'bin'),
    ];
  }
  return [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/usr/bin',
    '/bin',
    path.join(home, '.npm-global', 'bin'),
    path.join(home, '.nvm', 'current', 'bin'),
    path.join(home, '.local', 'bin'),
    path.join(home, '.copilot', 'bin'),
  ];
}

/**
 * Build an expanded PATH string with extra directories, deduped and filtered.
 */
export function getExpandedPath(): string {
  const current = process.env.PATH || '';
  const parts = current.split(path.delimiter).filter(Boolean);
  const seen = new Set(parts);
  for (const p of getExtraPathDirs()) {
    if (p && !seen.has(p)) {
      parts.push(p);
      seen.add(p);
    }
  }
  return parts.join(path.delimiter);
}

/**
 * GitHub Copilot CLI candidate installation paths.
 */
export function getCopilotCandidatePaths(): string[] {
  const home = os.homedir();
  if (isWindows) {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const exts = ['.cmd', '.exe', '.bat', ''];
    const baseDirs = [
      path.join(appData, 'npm'),
      path.join(localAppData, 'npm'),
      path.join(home, '.npm-global', 'bin'),
      path.join(home, '.copilot', 'bin'),
      path.join(home, '.local', 'bin'),
      path.join(localAppData, 'Programs', 'GitHub Copilot CLI'),
    ];
    const candidates: string[] = [];
    for (const dir of baseDirs) {
      for (const ext of exts) {
        candidates.push(path.join(dir, 'copilot' + ext));
        candidates.push(path.join(dir, 'github-copilot' + ext));
      }
    }
    return candidates;
  }
  return [
    '/usr/local/bin/copilot',
    '/usr/local/bin/github-copilot',
    '/opt/homebrew/bin/copilot',
    '/opt/homebrew/bin/github-copilot',
    path.join(home, '.npm-global', 'bin', 'copilot'),
    path.join(home, '.npm-global', 'bin', 'github-copilot'),
    path.join(home, '.local', 'bin', 'copilot'),
    path.join(home, '.local', 'bin', 'github-copilot'),
    path.join(home, '.copilot', 'bin', 'copilot'),
    path.join(home, '.copilot', 'bin', 'github-copilot'),
  ];
}

/**
 * Find and validate the GitHub Copilot CLI binary.
 * Tests each candidate with --version before returning.
 */
export function findCopilotBinary(): string | undefined {
  // Try known candidate paths first
  for (const p of getCopilotCandidatePaths()) {
    try {
      execFileSync(p, ['--version'], {
        timeout: 3000,
        stdio: 'pipe',
        shell: needsShell(p),
      });
      return p;
    } catch {
      // not found, try next
    }
  }

  // Fallback: use `where` (Windows) or `which` (Unix) with expanded PATH
  const binaryNames = ['copilot', 'github-copilot'];
  for (const binaryName of binaryNames) {
    try {
      const cmd = isWindows ? 'where' : '/usr/bin/which';
      const args = [binaryName];
      const result = execFileSync(cmd, args, {
        timeout: 3000,
        stdio: 'pipe',
        env: { ...process.env, PATH: getExpandedPath() },
        shell: isWindows,
      });
      // where.exe may return multiple lines; try each with --version validation
      const lines = result.toString().trim().split(/\r?\n/);
      for (const line of lines) {
        const candidate = line.trim();
        if (!candidate) continue;
        try {
          execFileSync(candidate, ['--version'], {
            timeout: 3000,
            stdio: 'pipe',
            shell: needsShell(candidate),
          });
          return candidate;
        } catch {
          continue;
        }
      }
    } catch {
      // not found, try next binary name
    }
  }

  return undefined;
}

/**
 * Execute copilot --version and return the version string.
 * Handles .cmd shell execution on Windows.
 */
export async function getCopilotVersion(copilotPath: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(copilotPath, ['--version'], {
      timeout: 5000,
      env: { ...process.env, PATH: getExpandedPath() },
      shell: needsShell(copilotPath),
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}
