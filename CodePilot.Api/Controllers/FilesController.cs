using Microsoft.AspNetCore.Mvc;

namespace CodePilot.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FilesController : ControllerBase
    {
        [HttpGet("browse")]
        public IActionResult BrowseFiles([FromQuery] string? path)
        {
            try
            {
                var targetPath = string.IsNullOrEmpty(path) 
                    ? Environment.CurrentDirectory 
                    : Path.GetFullPath(path);

                if (!Directory.Exists(targetPath))
                {
                    return NotFound(new { error = "Directory not found" });
                }

                var entries = new List<FileEntry>();
                var dirInfo = new DirectoryInfo(targetPath);

                // Add directories
                foreach (var dir in dirInfo.GetDirectories())
                {
                    if (!dir.Name.StartsWith(".") && dir.Name != "node_modules")
                    {
                        entries.Add(new FileEntry
                        {
                            Name = dir.Name,
                            Path = dir.FullName,
                            Type = "directory",
                            Size = 0
                        });
                    }
                }

                // Add files
                foreach (var file in dirInfo.GetFiles())
                {
                    if (!file.Name.StartsWith("."))
                    {
                        entries.Add(new FileEntry
                        {
                            Name = file.Name,
                            Path = file.FullName,
                            Type = "file",
                            Size = file.Length
                        });
                    }
                }

                return Ok(new
                {
                    path = targetPath,
                    entries = entries.OrderBy(e => e.Type).ThenBy(e => e.Name)
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[GET /api/files/browse] Error: {ex}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("preview")]
        public async Task<IActionResult> PreviewFile([FromBody] PreviewFileRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Path))
                {
                    return BadRequest(new { error = "Path is required" });
                }

                var filePath = Path.GetFullPath(request.Path);
                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound(new { error = "File not found" });
                }

                var fileInfo = new FileInfo(filePath);
                
                // Limit file size for preview (e.g., 1MB)
                if (fileInfo.Length > 1024 * 1024)
                {
                    return BadRequest(new { error = "File too large for preview (max 1MB)" });
                }

                var content = await System.IO.File.ReadAllTextAsync(filePath);

                return Ok(new
                {
                    path = filePath,
                    name = fileInfo.Name,
                    size = fileInfo.Length,
                    content,
                    extension = fileInfo.Extension
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[POST /api/files/preview] Error: {ex}");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public record FileEntry
    {
        public string Name { get; set; } = string.Empty;
        public string Path { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public long Size { get; set; }
    }

    public record PreviewFileRequest(string Path);
}
