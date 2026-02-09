# GitHub Copilot SDK Integration Notes

## SDK Package Information

The official GitHub Copilot SDK for .NET is available as a NuGet package:
- **Package Name**: `GitHub.Copilot.SDK`
- **Version**: 0.1.0 (or latest)
- **Install**: `dotnet add package GitHub.Copilot.SDK`

## Implementation Status

### Current Implementation

The `CopilotService.cs` provides a reference implementation using the expected SDK structure. However, the actual SDK API may differ from the Node.js version.

### Key SDK Classes (Expected)

Based on the Node.js SDK pattern, the C# SDK likely provides:

```csharp
// Client initialization
var client = new CopilotClient(new CopilotClientConfig 
{
    GitHubToken = "your-token",
    CliPath = "/path/to/copilot",
    WorkingDirectory = "/working/dir"
});

await client.StartAsync();

// Session creation
var session = await client.CreateSessionAsync(new SessionConfig 
{
    Model = "gpt-4",
    SystemMessage = new SystemMessage { Mode = SystemMessageMode.Append, Content = "..." }
});

// Event handling
session.On((CopilotEvent evt) => {
    switch (evt.Type) {
        case "assistant.message_delta":
            // Handle streaming content
            break;
        case "tool.execution_start":
            // Handle tool calls
            break;
        // ... other events
    }
});

// Send message
await session.SendAsync(new SendMessageRequest { Prompt = "Hello" });
```

### Actual SDK Documentation

For the exact API structure, refer to:
1. **Official GitHub Repository**: https://github.com/github/copilot-sdk
2. **NuGet Package Page**: https://www.nuget.org/packages/GitHub.Copilot.SDK
3. **.NET SDK Documentation**: Check the SDK's README or XML documentation

### Alternative Implementation Approaches

If the SDK structure differs significantly:

#### Option 1: Use Process Wrapper
```csharp
// Execute Copilot CLI directly as a process
var process = new Process
{
    StartInfo = new ProcessStartInfo
    {
        FileName = "copilot",
        Arguments = "chat",
        UseShellExecute = false,
        RedirectStandardOutput = true,
        RedirectStandardInput = true
    }
};
```

#### Option 2: HTTP Proxy to Node.js SDK
Keep a small Node.js service running that uses the Node.js SDK, and call it via HTTP from C#.

#### Option 3: Wait for Official SDK Maturity
The C# SDK is newer than the Node.js version. If it's not feature-complete, consider:
- Using the Node.js version temporarily via process execution
- Contributing to the SDK to add missing features
- Waiting for SDK updates

### Testing the Implementation

To test if the SDK integration works:

1. **Install Copilot CLI**:
   ```bash
   npm install -g @github/copilot
   copilot
   # Run /login command
   ```

2. **Set GitHub Token**:
   - Get token from: https://github.com/settings/tokens
   - Set in CodePilot Settings page

3. **Build and Run**:
   ```powershell
   .\build.ps1
   ```

4. **Test Chat**:
   - Open the application
   - Create a new session
   - Send a test message
   - Check if streaming works

### Troubleshooting

**If SDK classes don't match**:
1. Install the package: `dotnet add package GitHub.Copilot.SDK`
2. Check the actual namespace and class names
3. Update `CopilotService.cs` accordingly
4. Refer to SDK samples in the GitHub repository

**If SDK is not available**:
1. The package might be in preview/beta
2. Check package availability on NuGet.org
3. Consider using the Node.js SDK via subprocess as a temporary solution

### Next Steps

1. Test the current implementation
2. Adjust based on actual SDK structure
3. Add error handling for common scenarios
4. Implement message collection and database saving
5. Add comprehensive logging
6. Test with real GitHub Copilot subscription

## References

- GitHub Copilot SDK Repository: https://github.com/github/copilot-sdk
- NuGet Package: https://www.nuget.org/packages/GitHub.Copilot.SDK
- Node.js SDK (for reference): https://www.npmjs.com/package/@github/copilot-sdk
