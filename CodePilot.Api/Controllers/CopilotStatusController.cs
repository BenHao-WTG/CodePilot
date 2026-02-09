using CodePilot.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace CodePilot.Api.Controllers
{
    [ApiController]
    [Route("api/copilot-status")]
    public class CopilotStatusController : ControllerBase
    {
        private readonly ICopilotService _copilotService;
        private readonly ILogger<CopilotStatusController> _logger;

        public CopilotStatusController(
            ICopilotService copilotService,
            ILogger<CopilotStatusController> logger)
        {
            _copilotService = copilotService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetStatus()
        {
            try
            {
                var status = await _copilotService.GetStatusAsync();
                
                return Ok(new
                {
                    connected = status.Connected,
                    model = status.Model,
                    message = status.Message,
                    version = status.Version
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Copilot status");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
