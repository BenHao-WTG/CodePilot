using CodePilot.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodePilot.Api.Controllers
{
    [ApiController]
    [Route("api/chat/sessions")]
    public class ChatSessionsController : ControllerBase
    {
        private readonly CodePilotDbContext _context;

        public ChatSessionsController(CodePilotDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllSessions()
        {
            try
            {
                var sessions = await _context.ChatSessions
                    .OrderByDescending(s => s.UpdatedAt)
                    .ToListAsync();

                return Ok(new { sessions });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[GET /api/chat/sessions] Error: {ex}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateSession([FromBody] CreateSessionRequest request)
        {
            try
            {
                var session = new ChatSession
                {
                    Id = Guid.NewGuid().ToString("N"),
                    Title = request.Title ?? "New Chat",
                    Model = request.Model ?? string.Empty,
                    SystemPrompt = request.SystemPrompt ?? string.Empty,
                    WorkingDirectory = request.WorkingDirectory ?? Environment.CurrentDirectory,
                    Mode = request.Mode ?? "code",
                    ProjectName = string.IsNullOrEmpty(request.WorkingDirectory) 
                        ? string.Empty 
                        : Path.GetFileName(request.WorkingDirectory),
                    Status = "active",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.ChatSessions.Add(session);
                await _context.SaveChangesAsync();

                return StatusCode(201, new { session });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[POST /api/chat/sessions] Error: {ex}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetSession(string id)
        {
            try
            {
                var session = await _context.ChatSessions.FindAsync(id);
                if (session == null)
                {
                    return NotFound(new { error = "Session not found" });
                }

                return Ok(new { session });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[GET /api/chat/sessions/{id}] Error: {ex}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSession(string id)
        {
            try
            {
                var session = await _context.ChatSessions.FindAsync(id);
                if (session == null)
                {
                    return NotFound(new { error = "Session not found" });
                }

                _context.ChatSessions.Remove(session);
                await _context.SaveChangesAsync();

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[DELETE /api/chat/sessions/{id}] Error: {ex}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("{id}/messages")]
        public async Task<IActionResult> GetMessages(string id)
        {
            try
            {
                var session = await _context.ChatSessions.FindAsync(id);
                if (session == null)
                {
                    return NotFound(new { error = "Session not found" });
                }

                var messages = await _context.Messages
                    .Where(m => m.SessionId == id)
                    .OrderBy(m => m.CreatedAt)
                    .ToListAsync();

                return Ok(new { messages });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[GET /api/chat/sessions/{id}/messages] Error: {ex}");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public record CreateSessionRequest(
        string? Title,
        string? Model,
        string? SystemPrompt,
        string? WorkingDirectory,
        string? Mode
    );
}
