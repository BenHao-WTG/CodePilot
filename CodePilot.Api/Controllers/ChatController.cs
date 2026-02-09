using CodePilot.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace CodePilot.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly CodePilotDbContext _context;

        public ChatController(CodePilotDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.SessionId) || string.IsNullOrEmpty(request.Content))
                {
                    return BadRequest(new { error = "session_id and content are required" });
                }

                var session = await _context.ChatSessions.FindAsync(request.SessionId);
                if (session == null)
                {
                    return NotFound(new { error = "Session not found" });
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

                session.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // TODO: Implement GitHub Copilot SDK integration for C#
                // For now, return a placeholder response indicating the feature is pending
                Response.ContentType = "text/event-stream";
                Response.Headers.Add("Cache-Control", "no-cache");
                Response.Headers.Add("Connection", "keep-alive");

                var responseContent = "This is a placeholder response. The GitHub Copilot SDK integration in C# is pending implementation. " +
                                    "The WPF + WebView2 + Blazor architecture is ready, but the Copilot streaming functionality needs to be ported from the Node.js SDK to C#.";

                // Send SSE event
                await Response.WriteAsync($"event: message\n");
                await Response.WriteAsync($"data: {JsonSerializer.Serialize(new { content = responseContent })}\n\n");
                await Response.Body.FlushAsync();

                // Save assistant message
                var assistantMessage = new Message
                {
                    Id = Guid.NewGuid().ToString("N"),
                    SessionId = request.SessionId,
                    Role = "assistant",
                    Content = responseContent,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Messages.Add(assistantMessage);
                await _context.SaveChangesAsync();

                // Send done event
                await Response.WriteAsync($"event: done\n");
                await Response.WriteAsync($"data: {{}}\n\n");
                await Response.Body.FlushAsync();

                return new EmptyResult();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[POST /api/chat] Error: {ex}");
                return StatusCode(500, new { error = ex.Message });
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
