namespace CodePilot.Api.Services
{
    /// <summary>
    /// Service for interacting with GitHub Copilot SDK
    /// </summary>
    public interface ICopilotService
    {
        /// <summary>
        /// Stream a chat message to GitHub Copilot and get the response as SSE events
        /// </summary>
        Task<Stream> StreamMessageAsync(
            string prompt,
            string? sessionId = null,
            string? sdkSessionId = null,
            string? model = null,
            string? systemPrompt = null,
            string? workingDirectory = null,
            string? permissionMode = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Check if Copilot is available and authenticated
        /// </summary>
        Task<bool> CheckConnectionAsync();

        /// <summary>
        /// Get the current connection status
        /// </summary>
        Task<CopilotStatus> GetStatusAsync();
    }

    public record CopilotStatus(
        bool Connected,
        string? Model,
        string? Message,
        string? Version
    );
}
