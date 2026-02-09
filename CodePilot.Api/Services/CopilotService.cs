using GitHub.Copilot.SDK;
using CodePilot.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;

namespace CodePilot.Api.Services
{
    /// <summary>
    /// Implementation of GitHub Copilot service using the official SDK
    /// </summary>
    public class CopilotService : ICopilotService
    {
        private readonly CodePilotDbContext _context;
        private readonly ILogger<CopilotService> _logger;
        private string? _cachedCopilotPath;

        public CopilotService(CodePilotDbContext context, ILogger<CopilotService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Stream> StreamMessageAsync(
            string prompt,
            string? sessionId = null,
            string? sdkSessionId = null,
            string? model = null,
            string? systemPrompt = null,
            string? workingDirectory = null,
            string? permissionMode = null,
            CancellationToken cancellationToken = default)
        {
            var memoryStream = new MemoryStream();
            var writer = new StreamWriter(memoryStream, Encoding.UTF8, leaveOpen: true);

            try
            {
                // Get GitHub token from settings
                var githubToken = await _context.Settings
                    .Where(s => s.Key == "github_token")
                    .Select(s => s.Value)
                    .FirstOrDefaultAsync(cancellationToken);

                if (string.IsNullOrEmpty(githubToken))
                {
                    await WriteSSEEvent(writer, "error", "GitHub token not configured. Please set it in Settings.");
                    await WriteSSEEvent(writer, "done", "");
                    await writer.FlushAsync();
                    memoryStream.Position = 0;
                    return memoryStream;
                }

                // Find Copilot CLI path
                var copilotPath = FindCopilotPath();

                // Get default model if not specified
                if (string.IsNullOrEmpty(model))
                {
                    model = await _context.Settings
                        .Where(s => s.Key == "default_model")
                        .Select(s => s.Value)
                        .FirstOrDefaultAsync(cancellationToken) ?? "gpt-4";
                }

                // Initialize Copilot client
                var clientConfig = new CopilotClientOptions
                {
                    GithubToken = githubToken,
                    CliPath = copilotPath,
                    Cwd = workingDirectory ?? Environment.CurrentDirectory
                };

                await using var client = new CopilotClient(clientConfig);
                await client.StartAsync(cancellationToken);

                // Create session
                var sessionConfig = new SessionConfig
                {
                    Model = model
                };

                if (!string.IsNullOrEmpty(systemPrompt))
                {
                    sessionConfig.SystemMessage = new SystemMessageConfig
                    {
                        Mode = SystemMessageMode.Append,
                        Content = systemPrompt
                    };
                }

                await using var session = await client.CreateSessionAsync(sessionConfig, cancellationToken);

                var fullText = new StringBuilder();

                // Set up event handlers for streaming
                session.On(async (SessionEvent evt) =>
                {
                    try
                    {
                        switch (evt)
                        {
                            case AssistantMessageDeltaEvent deltaEvt:
                                if (!string.IsNullOrEmpty(deltaEvt.Data?.DeltaContent))
                                {
                                    fullText.Append(deltaEvt.Data.DeltaContent);
                                    await WriteSSEEvent(writer, "text", deltaEvt.Data.DeltaContent);
                                }
                                break;

                            case AssistantMessageEvent messageEvt:
                                if (!string.IsNullOrEmpty(messageEvt.Data?.Content))
                                {
                                    fullText.Clear();
                                    fullText.Append(messageEvt.Data.Content);
                                }
                                break;

                            case ToolExecutionStartEvent toolStartEvt:
                                if (toolStartEvt.Data != null)
                                {
                                    var toolUse = new
                                    {
                                        id = toolStartEvt.Data.ToolCallId,
                                        name = toolStartEvt.Data.ToolName,
                                        input = toolStartEvt.Data.Arguments ?? new object()
                                    };
                                    await WriteSSEEvent(writer, "tool_use", JsonSerializer.Serialize(toolUse));
                                }
                                break;

                            case ToolExecutionCompleteEvent toolCompleteEvt:
                                if (toolCompleteEvt.Data != null)
                                {
                                    var toolResult = new
                                    {
                                        tool_use_id = toolCompleteEvt.Data.ToolCallId,
                                        content = toolCompleteEvt.Data.Result?.Content ?? toolCompleteEvt.Data.Error?.Message ?? "",
                                        is_error = !toolCompleteEvt.Data.Success
                                    };
                                    await WriteSSEEvent(writer, "tool_result", JsonSerializer.Serialize(toolResult));
                                }
                                break;

                            case SessionErrorEvent errorEvt:
                                await WriteSSEEvent(writer, "error", errorEvt.Data?.Message ?? "Unknown error");
                                break;

                            case SessionIdleEvent:
                                // Session is done
                                var result = new { usage = (object?)null };
                                await WriteSSEEvent(writer, "result", JsonSerializer.Serialize(result));
                                await WriteSSEEvent(writer, "done", "");
                                break;
                        }

                        await writer.FlushAsync();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing Copilot event");
                    }
                });

                // Send the message
                await session.SendAsync(new MessageOptions { Prompt = prompt }, cancellationToken);

                // Wait for completion or cancellation
                await Task.Delay(Timeout.Infinite, cancellationToken);

            }
            catch (OperationCanceledException)
            {
                await WriteSSEEvent(writer, "done", "");
                await writer.FlushAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error streaming Copilot response");
                await WriteSSEEvent(writer, "error", ex.Message);
                await WriteSSEEvent(writer, "done", "");
                await writer.FlushAsync();
            }

            memoryStream.Position = 0;
            return memoryStream;
        }

        public async Task<bool> CheckConnectionAsync()
        {
            try
            {
                var githubToken = await _context.Settings
                    .Where(s => s.Key == "github_token")
                    .Select(s => s.Value)
                    .FirstOrDefaultAsync();

                if (string.IsNullOrEmpty(githubToken))
                {
                    return false;
                }

                var copilotPath = FindCopilotPath();
                if (string.IsNullOrEmpty(copilotPath))
                {
                    return false;
                }

                // Try to create a client and start it
                var clientConfig = new CopilotClientOptions
                {
                    GithubToken = githubToken,
                    CliPath = copilotPath
                };

                await using var client = new CopilotClient(clientConfig);
                await client.StartAsync();
                await client.StopAsync();

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Copilot connection check failed");
                return false;
            }
        }

        public async Task<CopilotStatus> GetStatusAsync()
        {
            try
            {
                var isConnected = await CheckConnectionAsync();
                var model = await _context.Settings
                    .Where(s => s.Key == "default_model")
                    .Select(s => s.Value)
                    .FirstOrDefaultAsync() ?? "gpt-4";

                return new CopilotStatus(
                    Connected: isConnected,
                    Model: model,
                    Message: isConnected ? "Connected to GitHub Copilot" : "Not connected. Check GitHub token in Settings.",
                    Version: "0.1.0"
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Copilot status");
                return new CopilotStatus(
                    Connected: false,
                    Model: null,
                    Message: $"Error: {ex.Message}",
                    Version: null
                );
            }
        }

        private string? FindCopilotPath()
        {
            if (_cachedCopilotPath != null)
            {
                return _cachedCopilotPath;
            }

            // Check common installation paths for Copilot CLI
            var paths = new[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".copilot", "bin", "copilot.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".copilot", "bin", "copilot"),
                "copilot.exe",
                "copilot"
            };

            foreach (var path in paths)
            {
                if (File.Exists(path))
                {
                    _cachedCopilotPath = path;
                    return path;
                }
            }

            // Try to find in PATH
            var pathEnv = Environment.GetEnvironmentVariable("PATH");
            if (!string.IsNullOrEmpty(pathEnv))
            {
                var pathDirs = pathEnv.Split(Path.PathSeparator);
                foreach (var dir in pathDirs)
                {
                    var copilotExe = Path.Combine(dir, "copilot.exe");
                    var copilot = Path.Combine(dir, "copilot");

                    if (File.Exists(copilotExe))
                    {
                        _cachedCopilotPath = copilotExe;
                        return copilotExe;
                    }
                    if (File.Exists(copilot))
                    {
                        _cachedCopilotPath = copilot;
                        return copilot;
                    }
                }
            }

            _logger.LogWarning("Copilot CLI not found in standard locations");
            return null;
        }

        private static async Task WriteSSEEvent(StreamWriter writer, string eventType, string data)
        {
            var eventData = new { type = eventType, data };
            await writer.WriteLineAsync($"data: {JsonSerializer.Serialize(eventData)}");
            await writer.WriteLineAsync();
        }
    }
}
