using CodePilot.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodePilot.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly CodePilotDbContext _context;

        public TasksController(CodePilotDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllTasks([FromQuery] string? sessionId)
        {
            try
            {
                var query = _context.Tasks.AsQueryable();

                if (!string.IsNullOrEmpty(sessionId))
                {
                    query = query.Where(t => t.SessionId == sessionId);
                }

                var tasks = await query
                    .OrderByDescending(t => t.CreatedAt)
                    .ToListAsync();

                return Ok(new { tasks });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[GET /api/tasks] Error: {ex}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.SessionId) || string.IsNullOrEmpty(request.Title))
                {
                    return BadRequest(new { error = "SessionId and Title are required" });
                }

                var session = await _context.ChatSessions.FindAsync(request.SessionId);
                if (session == null)
                {
                    return NotFound(new { error = "Session not found" });
                }

                var task = new TaskItem
                {
                    Id = Guid.NewGuid().ToString("N"),
                    SessionId = request.SessionId,
                    Title = request.Title,
                    Description = request.Description,
                    Status = request.Status ?? "pending",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Tasks.Add(task);
                await _context.SaveChangesAsync();

                return StatusCode(201, new { task });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[POST /api/tasks] Error: {ex}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(string id, [FromBody] UpdateTaskRequest request)
        {
            try
            {
                var task = await _context.Tasks.FindAsync(id);
                if (task == null)
                {
                    return NotFound(new { error = "Task not found" });
                }

                if (!string.IsNullOrEmpty(request.Title))
                    task.Title = request.Title;
                
                if (!string.IsNullOrEmpty(request.Description))
                    task.Description = request.Description;
                
                if (!string.IsNullOrEmpty(request.Status))
                    task.Status = request.Status;

                task.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { task });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[PUT /api/tasks/{id}] Error: {ex}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(string id)
        {
            try
            {
                var task = await _context.Tasks.FindAsync(id);
                if (task == null)
                {
                    return NotFound(new { error = "Task not found" });
                }

                _context.Tasks.Remove(task);
                await _context.SaveChangesAsync();

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[DELETE /api/tasks/{id}] Error: {ex}");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public record CreateTaskRequest(
        string SessionId,
        string Title,
        string? Description,
        string? Status
    );

    public record UpdateTaskRequest(
        string? Title,
        string? Description,
        string? Status
    );
}
