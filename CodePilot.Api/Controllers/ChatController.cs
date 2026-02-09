using CodePilot.Api.Data;
using CodePilot.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodePilot.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly CodePilotDbContext _context;
        private readonly ICopilotService _copilotService;
        private readonly ILogger<ChatController> _logger;

        public ChatController(
            CodePilotDbContext context,
            ICopilotService copilotService,
            ILogger<ChatController> logger)
        {
            _context = context;
            _copilotService = copilotService;
            _logger = logger;
        }

        [HttpPost]
        public async Task PostMessage([FromBody] SendMessageRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.SessionId) || string.IsNullOrEmpty(request.Content))
                {
                    Response.StatusCode = 400;
                    await Response.WriteAsJsonAsync(new { error = "session_id and content are required" });
                    return;
                }

                var session = await _context.ChatSessions.FindAsync(request.SessionId);
                if (session == null)
                {
                    Response.StatusCode = 404;
                    await Response.WriteAsJsonAsync(new { error = "Session not found" });
                    return;
                }

                // Save user message
                var userMessage = new Message
                {
                    Id = Guid.NewGuid().ToString("N"),
                    SessionId = request.SessionId,
                    Role = "user",
                    Content = request.Content,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Messages.Add(userMessage);

                // Auto-generate title from first message if still default
                if (session.Title == "New Chat")
                {
                    var title = request.Content.Length > 50 
                        ? request.Content.Substring(0, 50) + "..." 
                        : request.Content;
                    session.Title = title;
                }

                // Determine effective model and mode
                var effectiveModel = request.Model ?? session.Model ?? "gpt-4";
                var effectiveMode = request.Mode ?? session.Mode ?? "code";

                // Determine system prompt based on mode
                string? systemPromptOverride = null;
                if (effectiveMode == "ask")
                {
                    systemPromptOverride = (session.SystemPrompt ?? "") +
                        "\n\nYou are in Ask mode. Answer questions and provide information only. Do not use any tools, do not read or write files, do not execute commands. Only respond with text.";
                }

                session.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Set up SSE response
                Response.ContentType = "text/event-stream";
                Response.Headers.Append("Cache-Control", "no-cache");
                Response.Headers.Append("Connection", "keep-alive");

                // Stream the response from Copilot SDK
                var cancellationToken = HttpContext.RequestAborted;
                
                await using var responseStream = await _copilotService.StreamMessageAsync(
                    prompt: request.Content,
                    sessionId: request.SessionId,
                    sdkSessionId: session.SdkSessionId,
                    model: effectiveModel,
                    systemPrompt: systemPromptOverride ?? session.SystemPrompt,
                    workingDirectory: session.WorkingDirectory,
                    permissionMode: effectiveMode,
                    cancellationToken: cancellationToken);

                // Copy the stream to response
                await responseStream.CopyToAsync(Response.Body, cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);

                // Note: Assistant message is saved by the CopilotService after streaming completes
                // TODO: Collect the response and save it to the database

            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Chat request cancelled by client");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in chat endpoint");
                if (!Response.HasStarted)
                {
                    Response.StatusCode = 500;
                    await Response.WriteAsJsonAsync(new { error = ex.Message });
                }
            }
        }

        [HttpGet("permission")]
        public IActionResult GetPermission()
        {
            // Return permission configuration
            return Ok(new
            {
                mode = "acceptEdits",
                permissions = new
                {
                    read = true,
                    write = true,
                    execute = true
                }
            });
        }
    }

    public record SendMessageRequest(
        string SessionId,
        string Content,
        string? Model,
        string? Mode
    );
}
