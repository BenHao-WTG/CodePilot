using CodePilot.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodePilot.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly CodePilotDbContext _context;

        public SettingsController(CodePilotDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            var settings = await _context.Settings.ToDictionaryAsync(s => s.Key, s => s.Value);
            return Ok(new { settings });
        }

        [HttpPut]
        public async Task<IActionResult> UpdateSettings([FromBody] UpdateSettingsRequest request)
        {
            foreach (var (key, value) in request.Settings)
            {
                var setting = await _context.Settings.FirstOrDefaultAsync(s => s.Key == key);
                if (setting == null)
                {
                    _context.Settings.Add(new Setting { Key = key, Value = value });
                }
                else
                {
                    setting.Value = value;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }
    }

    public record UpdateSettingsRequest(Dictionary<string, string> Settings);
}
