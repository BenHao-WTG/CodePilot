using Microsoft.AspNetCore.Mvc;

namespace CodePilot.Api.Controllers
{
    [ApiController]
    [Route("api/copilot-status")]
    public class CopilotStatusController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetStatus()
        {
            try
            {
                // TODO: Implement actual Copilot status check
                // For now, return a basic status
                return Ok(new
                {
                    connected = false,
                    model = "gpt-4",
                    message = "GitHub Copilot integration pending (C# SDK implementation needed)"
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[GET /api/copilot-status] Error: {ex}");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
