import { CopilotClient, CopilotSession } from '@github/copilot-sdk';
import type {
  SessionEvent,
  SessionConfig,
  Tool,
  MCPServerConfig,
  PermissionRequest,
  PermissionHandler,
} from '@github/copilot-sdk';
import type { ClaudeStreamOptions, SSEEvent, TokenUsage, MCPServerConfig as AppMCPServerConfig, PermissionRequestEvent, FileAttachment } from '@/types';
import { isImageFile } from '@/types';
import { registerPendingPermission } from './permission-registry';
import { getSetting, getActiveProvider } from './db';
import { findGitBash, getExpandedPath } from './platform';
import os from 'os';
import fs from 'fs';
import path from 'path';

let globalCopilotClient: CopilotClient | null = null;

/**
 * Get or create the global Copilot client instance
 */
async function getCopilotClient(): Promise<CopilotClient> {
  if (globalCopilotClient) {
    return globalCopilotClient;
  }

  // Build environment for Copilot CLI
  const env: Record<string, string> = { ...process.env as Record<string, string> };

  // Ensure HOME/USERPROFILE are set
  if (!env.HOME) env.HOME = os.homedir();
  if (!env.USERPROFILE) env.USERPROFILE = os.homedir();
  env.PATH = getExpandedPath();

  // On Windows, auto-detect Git Bash if needed
  if (process.platform === 'win32' && !process.env.COPILOT_GIT_BASH_PATH) {
    const gitBashPath = findGitBash();
    if (gitBashPath) {
      env.COPILOT_GIT_BASH_PATH = gitBashPath;
    }
  }

  // Get GitHub token from active provider or settings
  let githubToken: string | undefined;
  const activeProvider = getActiveProvider();
  
  if (activeProvider && activeProvider.api_key) {
    githubToken = activeProvider.api_key;
  } else {
    const settingsToken = getSetting('github_token');
    if (settingsToken) {
      githubToken = settingsToken;
    } else if (env.GITHUB_TOKEN) {
      githubToken = env.GITHUB_TOKEN;
    }
  }

  if (!githubToken) {
    console.warn('[copilot-client] No GitHub token found: no active provider, no settings, and no GITHUB_TOKEN in environment');
  }

  globalCopilotClient = new CopilotClient({
    githubToken,
    env,
    logLevel: 'info',
    autoStart: true,
    autoRestart: true,
  });

  await globalCopilotClient.start();
  return globalCopilotClient;
}

/**
 * Convert our MCPServerConfig to the Copilot SDK's MCPServerConfig format
 */
function toSdkMcpConfig(
  servers: Record<string, AppMCPServerConfig>
): MCPServerConfig[] | undefined {
  const result: MCPServerConfig[] = [];
  
  for (const [name, config] of Object.entries(servers)) {
    const transport = config.type || 'stdio';

    switch (transport) {
      case 'stdio': {
        if (!config.command) {
          console.warn(`[mcp] stdio server "${name}" is missing command, skipping`);
          continue;
        }
        result.push({
          type: 'local',
          name,
          command: config.command,
          args: config.args,
          env: config.env,
        });
        break;
      }

      case 'sse':
      case 'http': {
        if (!config.url) {
          console.warn(`[mcp] ${transport.toUpperCase()} server "${name}" is missing url, skipping`);
          continue;
        }
        result.push({
          type: 'remote',
          name,
          url: config.url,
          headers: config.headers,
        });
        break;
      }
    }
  }
  
  return result.length > 0 ? result : undefined;
}

/**
 * Format an SSE line from an event object
 */
function formatSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Save non-image file attachments to a temporary upload directory
 */
function saveUploadedFiles(files: FileAttachment[], workDir: string): string[] {
  const uploadDir = path.join(workDir, '.codepilot-uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const savedPaths: string[] = [];
  for (const file of files) {
    const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const filePath = path.join(uploadDir, `${timestamp}-${safeName}`);
    const buffer = Buffer.from(file.data, 'base64');
    fs.writeFileSync(filePath, buffer);
    savedPaths.push(filePath);
  }
  return savedPaths;
}

/**
 * Stream Copilot responses using the Copilot SDK.
 * Returns a ReadableStream of SSE-formatted strings.
 */
export function streamCopilot(options: ClaudeStreamOptions): ReadableStream<string> {
  const {
    prompt,
    sdkSessionId,
    model,
    systemPrompt,
    workingDirectory,
    mcpServers,
    abortController,
    permissionMode,
    files,
  } = options;

  return new ReadableStream<string>({
    async start(controller) {
      let session: CopilotSession | null = null;
      let client: CopilotClient | null = null;

      try {
        client = await getCopilotClient();

        // Check if dangerously_skip_permissions is enabled
        const skipPermissions = getSetting('dangerously_skip_permissions') === 'true';

        // Build session config
        const sessionConfig: SessionConfig = {
          model: model || 'gpt-5',
        };

        // Add system message if provided
        if (systemPrompt) {
          sessionConfig.systemMessage = {
            mode: 'append',
            content: systemPrompt,
          };
        }

        // Add MCP servers if configured
        if (mcpServers && Object.keys(mcpServers).length > 0) {
          sessionConfig.mcpServers = toSdkMcpConfig(mcpServers);
        }

        // Set working directory
        if (workingDirectory) {
          sessionConfig.workingDirectory = workingDirectory;
        }

        // Permission handler
        if (!skipPermissions) {
          const permissionHandler: PermissionHandler = async (request: PermissionRequest) => {
            const permissionRequestId = `perm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

            const permEvent: PermissionRequestEvent = {
              permissionRequestId,
              toolName: request.toolName,
              toolInput: request.arguments,
              suggestions: undefined,
              decisionReason: undefined,
              blockedPath: undefined,
              toolUseId: request.toolCallId,
              description: undefined,
            };

            // Send permission_request SSE event to the client
            controller.enqueue(formatSSE({
              type: 'permission_request',
              data: JSON.stringify(permEvent),
            }));

            // Wait for user response
            const result = await registerPendingPermission(permissionRequestId, request.arguments, abortController?.signal);
            
            return {
              allow: result.allow,
              updatedInput: result.updatedInput,
            };
          };

          sessionConfig.permissionHandler = permissionHandler;
        }

        // Create or resume session
        if (sdkSessionId) {
          session = await client.resumeSession(sdkSessionId);
        } else {
          session = await client.createSession(sessionConfig);
        }

        // Send initial status
        controller.enqueue(formatSSE({
          type: 'status',
          data: JSON.stringify({
            session_id: session.sessionId,
            model: model || 'gpt-5',
          }),
        }));

        let tokenUsage: TokenUsage | null = null;
        let lastAssistantContent = '';

        // Set up event listeners
        session.on('assistant.message_delta', (event) => {
          if (event.data.deltaContent) {
            controller.enqueue(formatSSE({ type: 'text', data: event.data.deltaContent }));
          }
        });

        session.on('assistant.message', (event) => {
          if (event.data.content) {
            lastAssistantContent = event.data.content;
          }
        });

        session.on('tool.execution_start', (event) => {
          controller.enqueue(formatSSE({
            type: 'tool_use',
            data: JSON.stringify({
              id: event.data.toolCallId,
              name: event.data.toolName,
              input: event.data.arguments,
            }),
          }));
        });

        session.on('tool.execution_end', (event) => {
          controller.enqueue(formatSSE({
            type: 'tool_result',
            data: JSON.stringify({
              tool_use_id: event.data.toolCallId,
              content: typeof event.data.result === 'string' 
                ? event.data.result 
                : JSON.stringify(event.data.result),
              is_error: event.data.error !== undefined,
            }),
          }));
        });

        session.on('tool.output', (event) => {
          if (event.data.output) {
            controller.enqueue(formatSSE({
              type: 'tool_output',
              data: event.data.output,
            }));
          }
        });

        session.on('session.idle', () => {
          // Session is done processing
          controller.enqueue(formatSSE({
            type: 'result',
            data: JSON.stringify({
              subtype: 'completed',
              is_error: false,
              usage: tokenUsage,
              session_id: session?.sessionId,
            }),
          }));
          controller.enqueue(formatSSE({ type: 'done', data: '' }));
          controller.close();
        });

        session.on('session.error', (event) => {
          controller.enqueue(formatSSE({ 
            type: 'error', 
            data: event.data.error || 'Unknown error' 
          }));
          controller.enqueue(formatSSE({ type: 'done', data: '' }));
          controller.close();
        });

        // Handle abort
        if (abortController) {
          abortController.signal.addEventListener('abort', async () => {
            if (session) {
              await session.abort();
            }
          });
        }

        // Build the prompt with file attachments
        let finalPrompt = prompt;
        const attachments: Array<{ type: string; path: string; displayName?: string }> = [];

        if (files && files.length > 0) {
          const imageFiles = files.filter(f => isImageFile(f.type));
          const nonImageFiles = files.filter(f => !isImageFile(f.type));

          // Save non-image files to disk
          if (nonImageFiles.length > 0) {
            const workDir = workingDirectory || process.cwd();
            const savedPaths = saveUploadedFiles(nonImageFiles, workDir);
            const fileReferences = savedPaths
              .map((p, i) => `[User attached file: ${p} (${nonImageFiles[i].name})]`)
              .join('\n');
            finalPrompt = `${fileReferences}\n\nPlease read the attached file(s) above using your Read tool, then respond to the user's message:\n\n${prompt}`;
          }

          // Add image attachments
          for (const img of imageFiles) {
            // Save image to temp location for Copilot to access
            const workDir = workingDirectory || process.cwd();
            const uploadDir = path.join(workDir, '.codepilot-uploads');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            const safeName = path.basename(img.name).replace(/[^a-zA-Z0-9._-]/g, '_');
            const timestamp = Date.now();
            const filePath = path.join(uploadDir, `${timestamp}-${safeName}`);
            const buffer = Buffer.from(img.data, 'base64');
            fs.writeFileSync(filePath, buffer);
            
            attachments.push({
              type: 'file',
              path: filePath,
              displayName: img.name,
            });
          }
        }

        // Send message
        await session.send({
          prompt: finalPrompt,
          attachments: attachments.length > 0 ? attachments : undefined,
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue(formatSSE({ type: 'error', data: errorMessage }));
        controller.enqueue(formatSSE({ type: 'done', data: '' }));
        controller.close();
      }
    },

    cancel() {
      abortController?.abort();
    },
  });
}

/**
 * Shutdown the global Copilot client
 */
export async function shutdownCopilot(): Promise<void> {
  if (globalCopilotClient) {
    await globalCopilotClient.stop();
    globalCopilotClient = null;
  }
}
