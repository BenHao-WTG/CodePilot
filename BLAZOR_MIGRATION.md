# Blazor Server Migration Guide

## Overview

This document describes the migration from Next.js/React frontend to Blazor Server, which eliminates the need for Node.js and provides a unified C#/.NET technology stack.

## Architecture Change

### Before (Next.js + Blazor API)
```
┌─────────────────────────────────────┐
│         WPF Application             │
│  ┌───────────────────────────────┐  │
│  │        WebView2               │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │   Next.js Static App    │  │  │
│  │  │  (HTML/CSS/JS/React)    │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
           ↓ HTTP API Calls
┌─────────────────────────────────────┐
│      Blazor Web API Server          │
│  - Controllers                      │
│  - Services (Copilot SDK)           │
│  - Database (EF Core)               │
└─────────────────────────────────────┘

Build: npm build → dotnet build → run
Runtime: Node.js + .NET
```

### After (Blazor Server Only)
```
┌─────────────────────────────────────┐
│         WPF Application             │
│  ┌───────────────────────────────┐  │
│  │        WebView2               │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │    Blazor Server App    │  │  │
│  │  │  (Razor Components)     │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
           ↓ SignalR WebSocket
┌─────────────────────────────────────┐
│    Blazor Server (Same Process)     │
│  - Razor Pages                      │
│  - API Controllers                  │
│  - Services (Copilot SDK)           │
│  - Database (EF Core)               │
└─────────────────────────────────────┘

Build: dotnet build → run
Runtime: .NET only
```

## Benefits of Migration

### 1. Single Technology Stack
- **Before**: TypeScript/React + C#/Blazor
- **After**: C#/Blazor only
- No context switching between languages
- One set of tools and libraries
- Unified debugging experience

### 2. Simplified Build Process
- **Before**: `npm install` → `npm build` → `dotnet build`
- **After**: `dotnet build`
- Faster build times
- Fewer dependencies
- No Node.js required for building

### 3. Better Performance
- **Before**: HTTP API calls for all data
- **After**: Direct in-process method calls
- No serialization overhead
- No HTTP roundtrip
- Faster page loads

### 4. Easier Deployment
- **Before**: Deploy Next.js static files + .NET API
- **After**: Deploy single .NET application
- Smaller package size
- Simpler deployment process
- Fewer runtime dependencies

### 5. Direct Database Access
- **Before**: React → HTTP → Controller → Database
- **After**: Razor Component → DbContext → Database
- No API layer needed for simple queries
- Type-safe database operations
- Better error handling

## Migration Status

### Phase 1: Infrastructure & Home Page ✅ COMPLETE

#### Implemented
- [x] Blazor Server services in Program.cs
- [x] Razor Pages infrastructure
- [x] MainLayout component
- [x] Router configuration
- [x] Home page (Index.razor)
  - Welcome section
  - Copilot status
  - Recent sessions
  - Action cards
  - Getting started guide
- [x] CSS styling (app.css)
- [x] Navigation system
- [x] Placeholder Chat page
- [x] Placeholder Settings page
- [x] Updated build scripts

#### Files Created
```
CodePilot.Api/
├── App.razor (router)
├── Pages/
│   ├── _Host.cshtml (entry point)
│   ├── _Imports.razor (global usings)
│   ├── Index.razor (home page - 6KB)
│   ├── Chat.razor (placeholder)
│   └── Settings.razor (placeholder)
├── Shared/
│   └── MainLayout.razor (layout)
└── wwwroot/css/
    └── app.css (4.6KB styles)
```

### Phase 2: Chat Page (Pending)

Next.js chat page features to migrate:
- [ ] Message list component
- [ ] Message input component
- [ ] Streaming chat responses
- [ ] Tool execution display
- [ ] Permission dialogs
- [ ] Session management
- [ ] Model selection
- [ ] Working directory selection
- [ ] Mode selection (code/ask/plan)

**Challenge**: SignalR streaming vs SSE
- Current: Server-Sent Events (SSE)
- Blazor native: SignalR
- **Solution options**:
  1. Convert to SignalR (recommended)
  2. Keep SSE with custom implementation
  3. Hybrid: Use existing API endpoints from Blazor

### Phase 3: Settings Page (Pending)

Settings page features:
- [ ] GitHub token configuration
- [ ] Model selection
- [ ] Theme preferences
- [ ] Advanced settings
- [ ] Storage location
- [ ] Auto-save settings

### Phase 4: Additional Pages (Pending)

- [ ] Plugins page
- [ ] Plugins MCP page
- [ ] Extensions page
- [ ] Chat session detail page (`/chat/{id}`)

### Phase 5: Components Migration (Pending)

Shared components to migrate:
- [ ] Message components (from `src/components/chat/`)
- [ ] UI components (Button, Card, Input, etc.)
- [ ] File explorer component
- [ ] Model selector
- [ ] Theme toggle
- [ ] Help button

## Technical Details

### Blazor Server vs Blazor WebAssembly

**Why Blazor Server?**
- Faster initial load
- Direct access to server resources
- No client-side code download
- Better for desktop apps
- SignalR provides real-time updates

**Not WebAssembly because:**
- Larger initial download
- No direct server access
- Less suitable for desktop apps
- Limited to browser sandbox

### State Management

**Next.js/React:**
```typescript
const [state, setState] = useState(initialValue);
useEffect(() => { /* side effects */ }, [deps]);
```

**Blazor:**
```csharp
private string state = initialValue;
protected override async Task OnInitializedAsync()
{
    // Initialization
}
```

### Navigation

**Next.js/React:**
```typescript
const router = useRouter();
router.push('/chat');
```

**Blazor:**
```csharp
@inject NavigationManager Navigation
Navigation.NavigateTo("/chat");
```

### API Calls

**Next.js/React:**
```typescript
const response = await fetch('/api/chat/sessions');
const data = await response.json();
```

**Blazor (Option 1 - Direct):**
```csharp
@inject IDbContextFactory<CodePilotDbContext> DbFactory
var db = await DbFactory.CreateDbContextAsync();
var sessions = await db.ChatSessions.ToListAsync();
```

**Blazor (Option 2 - HTTP):**
```csharp
@inject HttpClient Http
var sessions = await Http.GetFromJsonAsync<List<Session>>("/api/chat/sessions");
```

## Development Workflow

### Building

```powershell
# Build the application
.\build.ps1

# Manual build
dotnet build CodePilot.sln
```

### Running

```powershell
# Run from build script
.\build.ps1
# Choose Y when prompted

# Run manually
dotnet run --project CodePilot.Desktop\CodePilot.Desktop.csproj
```

### Debugging

**Visual Studio:**
1. Open `CodePilot.sln`
2. Set `CodePilot.Desktop` as startup project
3. Press F5

**VS Code:**
1. Install C# Dev Kit extension
2. Open folder
3. F5 to debug

## Styling Approach

### CSS Strategy

Currently using **custom CSS** similar to Tailwind:
- Utility classes
- Component-scoped styles
- Responsive design
- Dark/light theme support

### Future Options

1. **Keep Custom CSS** (current)
   - Full control
   - Lightweight
   - Matches Next.js design

2. **Use MudBlazor**
   - Material Design
   - Rich component library
   - Built-in theming

3. **Use Radzen**
   - Professional components
   - Free tier available
   - Good documentation

4. **Use Bootstrap** (Blazor default)
   - Familiar for web devs
   - Large ecosystem
   - Well-documented

**Recommendation**: Keep custom CSS for now, consider MudBlazor for Phase 2+

## Testing Strategy

### Unit Testing

```csharp
// Test Blazor components with bUnit
[Fact]
public void HomePage_Displays_Welcome_Message()
{
    using var ctx = new TestContext();
    var component = ctx.RenderComponent<Index>();
    
    component.Find("h1").TextContent
        .Should().Contain("Welcome to CodePilot");
}
```

### Integration Testing

```csharp
// Test with in-memory database
[Fact]
public async Task HomePage_Loads_Recent_Sessions()
{
    var options = new DbContextOptionsBuilder<CodePilotDbContext>()
        .UseInMemoryDatabase("TestDb")
        .Options;
    
    await using var db = new CodePilotDbContext(options);
    // Add test data
    // Test component
}
```

## Deployment

### Development
```powershell
.\build.ps1
```

### Production
```powershell
.\publish.ps1
```

### Output
- Self-contained executable
- No Node.js required
- Single .exe file
- All dependencies included

## Migration Checklist

### Infrastructure ✅
- [x] Add Blazor Server services
- [x] Configure routing
- [x] Setup layouts
- [x] Add CSS framework
- [x] Update build scripts

### Pages
- [x] Home page (Index.razor)
- [ ] New chat page (Chat.razor)
- [ ] Chat session page (ChatSession.razor)
- [ ] Settings page (Settings.razor)
- [ ] Plugins page
- [ ] Extensions page

### Components
- [ ] Message list
- [ ] Message input
- [ ] Model selector
- [ ] File explorer
- [ ] Theme toggle
- [ ] Help dialog

### Features
- [ ] Real-time chat streaming
- [ ] File operations
- [ ] Session management
- [ ] Settings persistence
- [ ] Plugin system
- [ ] Extensions

### Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance tests

## Known Issues & Solutions

### Issue 1: SignalR vs SSE for Streaming

**Problem**: Current chat uses SSE, Blazor prefers SignalR

**Solutions**:
1. Use SignalR for streaming (recommended)
2. Implement SSE in Blazor with `StreamResult`
3. Keep existing API, call from Blazor

**Recommendation**: Use SignalR with `@bind` for real-time updates

### Issue 2: Component Library Differences

**Problem**: React components (shadcn/ui) not available in Blazor

**Solutions**:
1. Create custom Razor components
2. Use MudBlazor or Radzen
3. Port shadcn/ui styles to Blazor

**Recommendation**: Create custom components with similar styling

### Issue 3: Icons

**Problem**: HugeIcons React library not available

**Solutions**:
1. Use SVG icons directly in Razor
2. Use Blazor icon library (e.g., MudBlazor icons)
3. Create icon component wrapper

**Recommendation**: SVG icons in Razor components

## Performance Considerations

### Blazor Server Limitations

- **Connection required**: Needs active SignalR connection
- **Server resources**: Each user holds server memory
- **Latency**: Every UI interaction requires server roundtrip

### Optimizations

1. **Virtualization**: For long lists
2. **Lazy loading**: Load components on demand
3. **Caching**: Cache frequently accessed data
4. **Prerendering**: Faster initial page load

### Best Practices

```csharp
// Good: Virtualize large lists
<Virtualize Items="@messages" Context="message">
    <MessageComponent Message="@message" />
</Virtualize>

// Good: Debounce rapid updates
private Timer? _debounceTimer;
private void OnInputChange(string value)
{
    _debounceTimer?.Dispose();
    _debounceTimer = new Timer(_ => UpdateSearch(value), null, 300, Timeout.Infinite);
}

// Good: Use @key for list items
@foreach (var item in items)
{
    <div @key="item.Id">@item.Name</div>
}
```

## Resources

### Official Documentation
- [Blazor Documentation](https://docs.microsoft.com/aspnet/core/blazor)
- [Blazor Components](https://docs.microsoft.com/aspnet/core/blazor/components)
- [Blazor Routing](https://docs.microsoft.com/aspnet/core/blazor/fundamentals/routing)

### Component Libraries
- [MudBlazor](https://mudblazor.com/)
- [Radzen](https://blazor.radzen.com/)
- [Ant Design Blazor](https://antblazor.com/)

### Testing
- [bUnit](https://bunit.dev/) - Blazor component testing
- [Playwright](https://playwright.dev/) - E2E testing

## Next Steps

1. **Test Phase 1**: Build and run the home page
2. **Implement Chat Page**: Full migration with streaming
3. **Migrate Settings**: Configuration UI
4. **Component Library**: Build reusable components
5. **Testing**: Add unit and integration tests
6. **Documentation**: Update user guides

## Conclusion

The Blazor migration provides a modern, unified technology stack that simplifies development, deployment, and maintenance. Phase 1 (home page) is complete and ready for testing. The remaining pages will be migrated incrementally, maintaining feature parity with the Next.js version.
