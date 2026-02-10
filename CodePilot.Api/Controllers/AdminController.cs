using Microsoft.AspNetCore.Mvc;

namespace CodePilot.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IHostApplicationLifetime _applicationLifetime;
        private readonly ILogger<AdminController> _logger;

        public AdminController(
            IHostApplicationLifetime applicationLifetime,
            ILogger<AdminController> logger)
        {
            _applicationLifetime = applicationLifetime;
            _logger = logger;
        }

        [HttpPost("shutdown")]
        public IActionResult Shutdown()
        {
            _logger.LogInformation("Shutdown requested");
            
            // Trigger graceful shutdown asynchronously
            Task.Run(async () =>
            {
                await Task.Delay(500); // Give time to send response
                _applicationLifetime.StopApplication();
            });

            return Ok(new { message = "Shutdown initiated" });
        }
    }
}
