# WhoDidIt - Development Guide

## Overview

WhoDidIt is a desktop forensic diff viewer that combines blame, comparison, and AI-powered explanations. Think "GitLens + Beyond Compare + AI reviewer" in one desktop app.

## Architecture Philosophy

### Three-Layer Design

```
Main Process (electron/main.ts)
├── GitHub API calls (REST + GraphQL)
├── Authentication & token storage
├── Local caching (SQLite)
└── Rate limit handling

Preload Script (electron/preload.ts)
└── Secure IPC bridge (no direct node access in renderer)

Renderer Process (src/)
├── React UI
├── Monaco Editor (diff viewing)
├── Zustand (state management)
└── Service layer (API abstraction)
```

### Why This Matters

1. **Security**: Renderer has no direct Node.js/Electron access
2. **Performance**: Heavy operations in main process, UI stays responsive
3. **Testability**: Clear separation of concerns
4. **Scalability**: Easy to add local git support later

## Key Design Decisions

### GitHub-First Approach

**Current**: GitHub API only (REST + GraphQL)
- Fast to ship
- Works without cloning repos
- GraphQL blame API gives us what we need

**Future**: Add local git support
- Better rename detection
- Offline mode
- Full history walking

### Data Flow

```
User Action → Component → Store → Service → IPC → Main Process → GitHub API
                ↓
          UI Update ← Store Update ← IPC Response ← API Response
```

### State Management (Zustand)

```typescript
useAppStore
├── currentRepo
├── baseRef / headRef
├── currentComparison
├── selectedFile
└── UI state (showBlame, viewMode, etc.)
```

**Why Zustand over Redux?**
- Less boilerplate
- Better TypeScript inference
- Simpler mental model
- Perfect for this app's scope

## Component Structure

### The Three-Pane Layout

```
┌─────────────────────────────────────────┐
│ AppShell (Top Bar + Global Actions)     │
├───────────┬─────────────────┬───────────┤
│ FileList  │ DiffView        │ Detail    │
│           │ (Monaco)        │ Panel     │
│ - Status  │ - Side by side  │ - Commit  │
│ - Paths   │ - Inline        │ - Blame   │
│ - Stats   │ - Timeline      │ - Explain │
└───────────┴─────────────────┴───────────┘
```

### Component Responsibilities

**AppShell**: Global navigation, ref selection, keyboard shortcuts
**FileList**: Changed files, filtering, search
**DiffView**: Monaco diff editor, blame overlays, hunk navigation
**DetailPanel**: Tabbed panel with commit info, blame details, AI explanations

## Development Workflow

### First-Time Setup

```bash
npm install
```

### Running in Dev Mode

```bash
npm run dev
```

This starts:
1. Vite dev server on port 5173
2. Hot module reloading for React
3. Electron app pointing to dev server
4. DevTools open by default

### Building

```bash
npm run build
```

Creates production builds in `release/` directory for your platform.

## Next Steps: Implementation Priority

### Phase 1: MVP Core (Current)
- [x] Project structure
- [x] Basic UI layout
- [x] Monaco integration
- [ ] GitHub authentication (OAuth device flow)
- [ ] Repository selection
- [ ] Ref comparison (basic)

### Phase 2: Diff & Blame
- [ ] Fetch file contents from GitHub
- [ ] Display real diffs
- [ ] GraphQL blame integration
- [ ] Blame overlay in Monaco
- [ ] Click-to-navigate (line → commit → PR)

### Phase 3: AI Integration
- [ ] LLM service setup (OpenAI/Anthropic)
- [ ] Context building (diff + commits)
- [ ] Structured explanations
- [ ] Caching layer
- [ ] Token usage management

### Phase 4: Polish
- [ ] Keyboard shortcuts
- [ ] Search (⌘P)
- [ ] Saved comparisons
- [ ] Settings panel
- [ ] Error handling
- [ ] Loading states

### Phase 5: Advanced
- [ ] Timeline view (base vs old vs new)
- [ ] PR context integration
- [ ] "Ignore formatting commits"
- [ ] Local git mode
- [ ] Rename detection

## Key Technical Patterns

### IPC Communication

```typescript
// In main process
ipcMain.handle('github:compareRefs', async (_event, repo, base, head) => {
  const octokit = new Octokit({ auth: token })
  const result = await octokit.repos.compareCommits({ repo, base, head })
  return result.data
})

// In renderer (via service)
const result = await window.electronAPI.github.compareRefs(repo, base, head)
```

### Monaco Diff Editor

```typescript
<DiffEditor
  height="100%"
  language="typescript"
  original={oldContent}
  modified={newContent}
  theme="vs-dark"
  options={{
    renderSideBySide: true,
    readOnly: true,
    minimap: { enabled: true }
  }}
/>
```

### GitHub GraphQL Blame

```graphql
query {
  repository(owner: "org", name: "repo") {
    object(expression: "main:src/file.ts") {
      ... on Blob {
        blame {
          ranges {
            startingLine
            endingLine
            commit {
              oid
              author { name email date }
              message
            }
          }
        }
      }
    }
  }
}
```

## Performance Considerations

### Caching Strategy

```typescript
Cache Key: `${repo}:${ref}:${path}` → file content
Cache Key: `${repo}:${ref}:${path}:blame` → blame data
Cache Key: `${diffHash}:explanation` → LLM response
```

Use SQLite (via better-sqlite3) for persistent cache.

### Rate Limiting

- GitHub API: 5000 req/hour (authenticated)
- GraphQL: counted by query complexity
- Strategy: aggressive caching + show rate limit status

### Memory Management

- Don't load all diffs at once
- Virtual scrolling for large file lists
- Lazy-load blame data (only for visible lines)

## Debugging Tips

### Electron DevTools

- Main process: `console.log` → Terminal
- Renderer: DevTools (auto-opens in dev mode)
- IPC traffic: Enable `DEBUG=electron*` env var

### Common Issues

**Monaco not loading**: Check Vite config, ensure proper asset handling
**IPC not working**: Verify preload script is loaded, check contextBridge
**GitHub API errors**: Check rate limits, token permissions

## Code Style

- TypeScript strict mode
- Functional components (React hooks)
- Explicit return types for public functions
- CSS modules per component (co-located)

## Testing Strategy (Future)

- Unit: Services, utilities
- Integration: IPC handlers
- E2E: Playwright for full app testing
- Manual: The real world is messy, test with actual repos

## Resources

- [Electron IPC Guide](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/index.html)
- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [Octokit REST](https://octokit.github.io/rest.js/)

## Questions? Design Decisions?

This is a living document. As you build, update this with:
- Decisions made and why
- Gotchas discovered
- Performance wins
- API quirks

The goal: anyone can pick this up and understand the architecture in 15 minutes.
