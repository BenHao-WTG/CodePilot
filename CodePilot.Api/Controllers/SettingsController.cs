using CodePilot.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodePilot.Api.Controllers
{
    [ApiController]
    [Route("api/settings")]
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

    // App-level settings endpoint (separate from CLI settings)
    [ApiController]
    [Route("api/settings/app")]
    public class AppSettingsController : ControllerBase
    {
        private readonly CodePilotDbContext _context;
        private static readonly string[] AllowedKeys = new[] { "github_token" };

        public AppSettingsController(CodePilotDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAppSettings()
        {
            var result = new Dictionary<string, string>();
            
            foreach (var key in AllowedKeys)
            {
                var setting = await _context.Settings.FirstOrDefaultAsync(s => s.Key == key);
                if (setting != null)
                {
                    // Mask token for security (only return last 8 chars)
                    if (key == "github_token" && setting.Value.Length > 8)
                    {
                        result[key] = "***" + setting.Value.Substring(setting.Value.Length - 8);
                    }
                    else
                    {
                        result[key] = setting.Value;
                    }
                }
            }

            return Ok(new { settings = result });
        }

        [HttpPut]
        public async Task<IActionResult> UpdateAppSettings([FromBody] UpdateSettingsRequest request)
        {
            foreach (var (key, value) in request.Settings)
            {
                if (!AllowedKeys.Contains(key)) continue;

                var strValue = value?.Trim() ?? string.Empty;
                
                // Don't overwrite token if user sent the masked version back
                if (key == "github_token" && strValue.StartsWith("***"))
                {
                    continue;
                }

                var setting = await _context.Settings.FirstOrDefaultAsync(s => s.Key == key);
                if (setting == null)
                {
                    if (!string.IsNullOrEmpty(strValue))
                    {
                        _context.Settings.Add(new Setting { Key = key, Value = strValue });
                    }
                }
                else
                {
                    if (string.IsNullOrEmpty(strValue))
                    {
                        _context.Settings.Remove(setting);
                    }
                    else
                    {
                        setting.Value = strValue;
                    }
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }
    }

    public record UpdateSettingsRequest(Dictionary<string, string> Settings);
}
