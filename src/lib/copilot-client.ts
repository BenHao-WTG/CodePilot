import { CopilotClient } from '@github/copilot-sdk';
import type { CopilotStreamOptions, SSEEvent, TokenUsage, MCPServerConfig, PermissionRequestEvent } from '@/types';
import { registerPendingPermission } from './permission-registry';
import { getSetting } from './db';
import { findCopilotBinary, getExpandedPath } from './platform';
import os from 'os';

let cachedCopilotPath: string | null | undefined;

function findCopilotPath(): string | undefined {
  if (cachedCopilotPath !== undefined) return cachedCopilotPath || undefined;
  const found = findCopilotBinary();
  cachedCopilotPath = found ?? null;
  return found;
}

/**
 * Format an SSE line from an event object
 */
function formatSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Stream GitHub Copilot responses using the Copilot SDK.
 * Returns a ReadableStream of SSE-formatted strings.
 */
export function streamCopilot(options: CopilotStreamOptions): ReadableStream<string> {
  const {
    prompt,
    sdkSessionId,
    model,
    systemPrompt,
    workingDirectory,
    mcpServers,
    abortController,
    permissionMode,
  } = options;

  return new ReadableStream<string>({
    async start(controller) {
      try {
        // Build env for the Copilot CLI subprocess.
        const sdkEnv: Record<string, string> = { ...process.env as Record<string, string> };

        // Ensure HOME/USERPROFILE are set
        if (!sdkEnv.HOME) sdkEnv.HOME = os.homedir();
        if (!sdkEnv.USERPROFILE) sdkEnv.USERPROFILE = os.homedir();
        sdkEnv.PATH = getExpandedPath();

        // GitHub Copilot uses GITHUB_TOKEN for authentication
        const githubToken = getSetting('github_token');
        
        // Find copilot binary for packaged app where PATH is limited
        const copilotPath = findCopilotPath();
        
        // Initialize Copilot client
        const client = new CopilotClient({
          githubToken: githubToken || undefined,
          cliPath: copilotPath,
          env: sdkEnv,
          cwd: workingDirectory,
        });

        // Start the client
        await client.start();

        // Create a session
        const session = await client.createSession({
          model: model || getSetting('default_model') || 'gpt-4',
          systemMessage: systemPrompt ? { mode: 'append', content: systemPrompt } : undefined,
          workingDirectory: workingDirectory || process.cwd(),
        });

        let fullText = '';
        let tokenUsage: TokenUsage | null = null;

        // Set up event listeners for streaming
        session.on((event) => {
          switch (event.type) {
            case 'assistant.message_delta':
              if (event.data.deltaContent) {
                fullText += event.data.deltaContent;
                controller.enqueue(formatSSE({ type: 'text', data: event.data.deltaContent }));
              }
              break;

            case 'assistant.message':
              // Final message with full content
              if (event.data.content) {
                fullText = event.data.content;
              }
              break;

            case 'tool.execution_start':
              controller.enqueue(formatSSE({
                type: 'tool_use',
                data: JSON.stringify({
                  id: event.data.toolCallId,
                  name: event.data.toolName,
                  input: event.data.arguments || {},
                }),
              }));
              break;

            case 'tool.execution_complete':
              controller.enqueue(formatSSE({
                type: 'tool_result',
                data: JSON.stringify({
                  tool_use_id: event.data.toolCallId,
                  content: event.data.result?.content || event.data.error?.message || '',
                  is_error: !event.data.success,
                }),
              }));
              break;

            case 'session.error':
              controller.enqueue(formatSSE({ 
                type: 'error', 
                data: event.data.message || 'Unknown error' 
              }));
              break;

            case 'session.idle':
              // Session is done processing
              controller.enqueue(formatSSE({
                type: 'result',
                data: JSON.stringify({
                  usage: tokenUsage,
                }),
              }));
              controller.enqueue(formatSSE({ type: 'done', data: '' }));
              controller.close();
              session.destroy().catch(() => {});
              client.stop().catch(() => {});
              break;
          }
        });

        // Send the message (event handlers are already registered above)
        await session.send({ prompt });

        // Handle abort (registered after send to ensure message is sent)
        abortController?.signal.addEventListener('abort', () => {
          session.destroy().catch(() => {});
          client.stop().catch(() => {});
          controller.close();
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

// Backward compatibility export
export const streamClaude = streamCopilot;
