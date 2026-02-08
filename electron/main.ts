import { app, BrowserWindow, nativeImage, dialog } from 'electron';
import path from 'path';
import { spawn, execFileSync, ChildProcess } from 'child_process';
import fs from 'fs';
import net from 'net';
import os from 'os';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let serverPort: number | null = null;
let serverErrors: string[] = [];
let userShellEnv: Record<string, string> = {};

const isDev = !app.isPackaged;

/**
 * Verify that better_sqlite3.node in standalone resources is compatible
 * with this Electron runtime's ABI. If it was built for a different
 * Node.js ABI (e.g. system Node v22 ABI 127 vs Electron's ABI 143),
 * show a clear error instead of a cryptic MODULE_NOT_FOUND crash.
 */
function checkNativeModuleABI(): void {
  if (isDev) return; // Skip in dev mode

  const standaloneDir = path.join(process.resourcesPath, 'standalone');

  // Find better_sqlite3.node recursively
  function findNodeFile(dir: string): string | null {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = findNodeFile(fullPath);
        if (found) return found;
      } else if (entry.name === 'better_sqlite3.node') {
        return fullPath;
      }
    }
    return null;
  }

  const nodeFile = findNodeFile(path.join(standaloneDir, 'node_modules'));
  if (!nodeFile) {
    console.warn('[ABI check] better_sqlite3.node not found in standalone resources');
    return;
  }

  try {
    // Attempt to load the native module to verify ABI compatibility
    process.dlopen({ exports: {} } as NodeModule, nodeFile);
    console.log(`[ABI check] better_sqlite3.node ABI is compatible (${nodeFile})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('NODE_MODULE_VERSION')) {
      console.error(`[ABI check] ABI mismatch detected: ${msg}`);
      dialog.showErrorBox(
        'CodePilot - Native Module ABI Mismatch',
        `The bundled better-sqlite3 native module was compiled for a different Node.js version.\n\n` +
        `${msg}\n\n` +
        `This usually means the build process did not correctly recompile native modules for Electron.\n` +
        `Please rebuild the application or report this issue.`
      );
      app.quit();
    } else {
      // Other load errors (missing dependencies, etc.) -- log but don't block
      console.warn(`[ABI check] Could not verify better_sqlite3.node: ${msg}`);
    }
  }
}

/**
 * Read the user's full shell environment by running a login shell.
 * When Electron is launched from Dock/Finder, process.env is very limited
 * and won't include vars from .zshrc/.bashrc (e.g. API keys).
 * 
 * This is now async and non-blocking to improve startup time.
 */
async function loadUserShellEnvAsync(): Promise<Record<string, string>> {
  // Only macOS needs login-shell env loading; Windows/Linux GUI apps inherit full env
  if (process.platform !== 'darwin') {
    return {};
  }
  const startTime = Date.now();
  try {
    const shell = process.env.SHELL || '/bin/zsh';
    console.log(`[Startup] Loading shell environment from ${shell}...`);
    
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);
    
    const { stdout } = await execFileAsync(shell, ['-ilc', 'env'], {
      timeout: 2000, // Reduced from 3000ms to 2000ms
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024, // 1MB buffer
    });
    
    const env: Record<string, string> = {};
    for (const line of stdout.split('\n')) {
      const idx = line.indexOf('=');
      if (idx > 0) {
        const key = line.slice(0, idx);
        const value = line.slice(idx + 1);
        env[key] = value;
      }
    }
    const elapsed = Date.now() - startTime;
    console.log(`[Startup] Loaded ${Object.keys(env).length} env vars from user shell in ${elapsed}ms`);
    return env;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.warn(`[Startup] Failed to load user shell env after ${elapsed}ms (will use process.env):`, err);
    return {};
  }
}

function getPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error('Failed to get port')));
      }
    });
  });
}

async function waitForServer(port: number, timeout = 30000): Promise<void> {
  const start = Date.now();
  console.log(`[Startup] Waiting for server on port ${port}...`);
  let attempts = 0;
  let pollInterval = 50; // Start with 50ms polling
  
  while (Date.now() - start < timeout) {
    attempts++;
    // If the server process already exited, fail fast
    if (serverProcess && serverProcess.exitCode !== null) {
      throw new Error(
        `Server process exited with code ${serverProcess.exitCode}.\n\n${serverErrors.join('\n')}`
      );
    }
    try {
      await new Promise<void>((resolve, reject) => {
        const req = require('http').get(`http://127.0.0.1:${port}/api/health`, (res: { statusCode?: number }) => {
          if (res.statusCode === 200) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(500, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      const elapsed = Date.now() - start;
      console.log(`[Startup] Server ready after ${elapsed}ms (${attempts} attempts)`);
      return;
    } catch {
      // Exponential backoff: 50ms -> 100ms -> 200ms (max)
      await new Promise(r => setTimeout(r, pollInterval));
      if (pollInterval < 200) pollInterval = Math.min(pollInterval * 2, 200);
    }
  }
  throw new Error(
    `Server startup timeout after ${timeout / 1000}s.\n\n${serverErrors.length > 0 ? 'Server output:\n' + serverErrors.slice(-10).join('\n') : 'No server output captured.'}`
  );
}

function startServer(port: number): ChildProcess {
  const standaloneDir = path.join(process.resourcesPath, 'standalone');
  const serverPath = path.join(standaloneDir, 'server.js');

  // Always use Electron's built-in Node.js in packaged mode.
  // electron-builder's @electron/rebuild compiles native modules (better-sqlite3)
  // for Electron's Node ABI, so we must use the matching runtime.
  const nodePath = process.execPath;

  console.log(`Using Node.js: ${nodePath}`);
  console.log(`Server path: ${serverPath}`);
  console.log(`Standalone dir: ${standaloneDir}`);

  serverErrors = [];

  const home = os.homedir();
  const shellPath = userShellEnv.PATH || process.env.PATH || '';
  const sep = path.delimiter; // ';' on Windows, ':' on Unix

  let constructedPath: string;
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const winExtra = [
      path.join(appData, 'npm'),
      path.join(localAppData, 'npm'),
      path.join(home, '.npm-global', 'bin'),
      path.join(home, '.local', 'bin'),
      path.join(home, '.copilot', 'bin'),
    ];
    const allParts = [shellPath, ...winExtra].join(sep).split(sep).filter(Boolean);
    constructedPath = [...new Set(allParts)].join(sep);
  } else {
    const basePath = `/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin`;
    const raw = `${basePath}:${home}/.npm-global/bin:${home}/.local/bin:${home}/.copilot/bin:${shellPath}`;
    const allParts = raw.split(':').filter(Boolean);
    constructedPath = [...new Set(allParts)].join(':');
  }

  const env: Record<string, string> = {
    ...userShellEnv,
    ...(process.env as Record<string, string>),
    // Ensure user shell env vars override (especially API keys)
    ...userShellEnv,
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    CLAUDE_GUI_DATA_DIR: path.join(home, '.codepilot'),
    ELECTRON_RUN_AS_NODE: '1',
    HOME: home,
    USERPROFILE: home,
    PATH: constructedPath,
  };

  // On Windows, spawn Node.js directly with windowsHide to prevent console flash.
  // On macOS, spawn via /bin/sh to prevent the Electron binary from appearing
  // as a separate Dock icon (even with ELECTRON_RUN_AS_NODE=1).
  let child: ChildProcess;
  if (process.platform === 'win32') {
    child = spawn(nodePath, [serverPath], {
      env,
      stdio: 'pipe',
      cwd: standaloneDir,
      windowsHide: true,
    });
  } else {
    child = spawn('/bin/sh', ['-c', `exec "${nodePath}" "${serverPath}"`], {
      env,
      stdio: 'pipe',
      cwd: standaloneDir,
    });
  }

  child.stdout?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    console.log(`[server] ${msg}`);
    serverErrors.push(msg);
  });

  child.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    console.error(`[server:err] ${msg}`);
    serverErrors.push(msg);
  });

  child.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
    serverProcess = null;
  });

  return child;
}

function getIconPath(): string {
  if (isDev) {
    return path.join(process.cwd(), 'build', 'icon.png');
  }
  if (process.platform === 'win32') {
    return path.join(process.resourcesPath, 'icon.ico');
  }
  return path.join(process.resourcesPath, 'icon.icns');
}

function createWindow(port: number) {
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  };

  if (process.platform === 'darwin') {
    windowOptions.titleBarStyle = 'hiddenInset';
  } else if (process.platform === 'win32') {
    windowOptions.titleBarStyle = 'hidden';
    windowOptions.titleBarOverlay = {
      color: '#00000000',
      symbolColor: '#888888',
      height: 44,
    };
  }

  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  const appStartTime = Date.now();
  console.log('[Startup] App ready, initializing...');
  
  // Start loading shell environment asynchronously (don't wait for it)
  const shellEnvStartTime = Date.now();
  const shellEnvPromise = loadUserShellEnvAsync();
  // Don't await here - continue with other startup tasks
  
  // Verify native module ABI compatibility before starting the server
  const abiCheckStartTime = Date.now();
  checkNativeModuleABI();
  console.log(`[Startup] ABI check completed in ${Date.now() - abiCheckStartTime}ms`);

  // Set macOS Dock icon
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = getIconPath();
    app.dock.setIcon(nativeImage.createFromPath(iconPath));
  }

  try {
    let port: number;

    if (isDev) {
      port = 3000;
      console.log(`[Startup] Dev mode: connecting to http://127.0.0.1:${port}`);
      // Still wait for shell env in dev mode for API keys
      userShellEnv = await shellEnvPromise;
      console.log(`[Startup] Shell env loaded in ${Date.now() - shellEnvStartTime}ms`);
    } else {
      const portStartTime = Date.now();
      port = await getPort();
      console.log(`[Startup] Got free port ${port} in ${Date.now() - portStartTime}ms`);
      
      // Wait for shell env before starting server (in parallel if possible)
      const shellEnvWaitStart = Date.now();
      userShellEnv = await shellEnvPromise;
      console.log(`[Startup] Shell env loaded in ${Date.now() - shellEnvWaitStart}ms (total: ${Date.now() - shellEnvStartTime}ms)`);
      
      const serverStartTime = Date.now();
      console.log('[Startup] Starting server process...');
      serverProcess = startServer(port);
      console.log(`[Startup] Server process spawned in ${Date.now() - serverStartTime}ms`);
      
      const waitStartTime = Date.now();
      await waitForServer(port);
      console.log(`[Startup] Server wait completed in ${Date.now() - waitStartTime}ms`);
      console.log('[Startup] Server is ready');
    }

    serverPort = port;
    const windowStartTime = Date.now();
    createWindow(port);
    console.log(`[Startup] Window created in ${Date.now() - windowStartTime}ms`);
    console.log(`[Startup] Total startup time: ${Date.now() - appStartTime}ms`);
  } catch (err) {
    console.error('[Startup] Failed to start:', err);
    dialog.showErrorBox(
      'CodePilot - Failed to Start',
      `The internal server could not start.\n\n${err instanceof Error ? err.message : String(err)}\n\nPlease try restarting the application.`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    try {
      if (!isDev && !serverProcess) {
        const port = await getPort();
        serverProcess = startServer(port);
        await waitForServer(port);
        serverPort = port;
      }
      createWindow(serverPort || 3000);
    } catch (err) {
      console.error('Failed to restart server:', err);
    }
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
