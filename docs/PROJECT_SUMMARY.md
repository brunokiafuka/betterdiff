# WhoDidIt - Project Summary

## What You Have Now

A fully scaffolded Electron + React + TypeScript desktop application with:

### Core Architecture ✓
- **Electron main process** (`electron/main.ts`) - Handles GitHub API, auth, caching
- **Preload script** (`electron/preload.ts`) - Secure IPC bridge
- **React renderer** (`src/`) - UI with Monaco Editor integration
- **Zustand state management** (`src/stores/`) - Clean, typed state
- **Service layer** (`src/services/`) - GitHub and LLM abstractions

### UI Components ✓
All styled with VS Code dark theme aesthetic:
- **AppShell** - Top bar with repo/ref selectors, global actions
- **FileList** - Changed files panel with status indicators
- **DiffView** - Monaco diff editor (side-by-side/inline modes)
- **DetailPanel** - Tabbed panel (Details/Blame/Explain)

### Utilities ✓
- **Keyboard manager** - App-wide shortcuts (⌘P, ⌘E, etc.)
- **Diff utilities** - Parse patches, extract context, calculate stats
- **Format utilities** - Dates, file paths, commit SHAs, etc.

### Developer Experience ✓
- TypeScript with strict mode
- Hot module reloading (Vite)
- Proper git setup with .gitignore
- Comprehensive documentation (README + DEVELOPMENT.md)

## The Three-Pane Layout

```
┌─────────────────────────────────────────────────┐
│ ⚡ WhoDidIt                                     │
│ Repo: org/project  Base: main →  Compare: feat │
│ [Blame] [Explain] [Settings]                    │
├────────────┬────────────────────────┬───────────┤
│ Files (12) │ Diff Editor            │ Details   │
├────────────┤                        ├───────────┤
│ M src/a.ts │  - old code            │ ┌───────┐ │
│ A src/b.ts │  + new code            │ │Details││
│ D old/c.ts │                        │ │Blame  ││
│            │  Monaco Diff Editor    │ │Explain││
│            │  - Syntax highlight    │ └───────┘ │
│            │  - Line numbers        │           │
│            │  - Blame gutter        │ Commit    │
│            │                        │ abc123    │
│            │                        │ Alice K.  │
│            │                        │ 2d ago    │
└────────────┴────────────────────────┴───────────┘
```

## What Works Right Now

### ✓ Visual Structure
All components render with proper styling and layout.

### ✓ State Management
The Zustand store is wired up and components respond to state changes.

### ✓ Monaco Integration
Diff editor is configured and ready to display real diffs.

### ✓ Type Safety
All core types are defined (Repo, GitRef, Comparison, FileChange, etc.).

## What's Next (Priority Order)

### 1. GitHub Authentication 🔒
**Why First**: You need auth to make any API calls.

**Implementation**:
- Use GitHub OAuth Device Flow (perfect for desktop)
- Store token securely (electron-store or system keychain)
- Add "Connect GitHub" flow to AppShell

**Files to modify**:
- `electron/main.ts` - Add OAuth handler
- `src/components/AppShell.tsx` - Add auth UI

### 2. Repository Selection 📁
**Why Second**: Users need to pick a repo to compare.

**Implementation**:
- Fetch user's repos via Octokit
- Show searchable repo list
- Store selected repo in state

**Files to modify**:
- `electron/main.ts` - Add `fetchRepos` implementation
- `src/components/RepoSelector.tsx` - New component
- `src/stores/appStore.ts` - Add repo list state

### 3. Ref Comparison 🔀
**Why Third**: Core feature - compare two Git refs.

**Implementation**:
- Fetch available refs (branches, tags)
- Use GitHub Compare API
- Parse response into FileChange[]

**Files to modify**:
- `electron/main.ts` - Implement `compareRefs`
- `src/components/AppShell.tsx` - Wire up ref selectors
- `src/services/github.ts` - Add response parsing

### 4. Real Diff Display 📊
**Why Fourth**: Show actual file contents in Monaco.

**Implementation**:
- Fetch file contents at base and head refs
- Pass to Monaco DiffEditor
- Handle binary files, images, etc.

**Files to modify**:
- `electron/main.ts` - Add file content fetching
- `src/components/DiffView.tsx` - Wire up real content
- `src/services/github.ts` - Add content API calls

### 5. Blame Integration 🔍
**Why Fifth**: Key differentiator - show who changed what.

**Implementation**:
- Use GitHub GraphQL blame API
- Render blame gutter in Monaco
- Click blame → show commit details

**Files to modify**:
- `electron/main.ts` - Add GraphQL blame query
- `src/components/DiffView.tsx` - Add blame decorations
- `src/components/DetailPanel.tsx` - Show blame details

### 6. AI Explanations 🤖
**Why Sixth**: The "magic" feature.

**Implementation**:
- Choose LLM provider (OpenAI/Anthropic/Ollama)
- Build smart context (diff + commits + file context)
- Structure output (summary, risks, tests)
- Cache responses

**Files to modify**:
- `electron/main.ts` - Add LLM API calls
- `src/services/llm.ts` - Implement explain logic
- `src/components/DetailPanel.tsx` - Show explanations

## Quick Start Commands

```bash
# Development mode (hot reload)
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit

# Check for issues
npm audit
```

## Project Structure

```
whodidit/
├── electron/
│   ├── main.ts           # Main process (GitHub API, auth)
│   └── preload.ts        # IPC bridge
├── src/
│   ├── components/       # React UI components
│   │   ├── AppShell.tsx
│   │   ├── FileList.tsx
│   │   ├── DiffView.tsx
│   │   └── DetailPanel.tsx
│   ├── services/         # API abstraction layer
│   │   ├── github.ts
│   │   └── llm.ts
│   ├── stores/           # Zustand state
│   │   └── appStore.ts
│   ├── types/            # TypeScript types
│   │   └── index.ts
│   ├── utils/            # Helper functions
│   │   ├── keyboard.ts
│   │   ├── diff.ts
│   │   └── format.ts
│   ├── App.tsx
│   └── main.tsx
├── DEVELOPMENT.md        # Architecture deep dive
├── README.md             # User-facing docs
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Key Technologies

| Tech | Purpose | Why? |
|------|---------|------|
| **Electron** | Desktop app framework | Native OS integration, no CORS issues |
| **React** | UI framework | Component-based, huge ecosystem |
| **TypeScript** | Type safety | Catch errors at compile time |
| **Vite** | Build tool | Fast HMR, modern bundling |
| **Monaco Editor** | Diff viewer | VS Code's editor, best-in-class |
| **Zustand** | State management | Simple, TypeScript-friendly |
| **Octokit** | GitHub API | Official GitHub SDK |

## Design Philosophy

### Desktop-First UX
Not a web app in a window - feels like a native dev tool.
- Keyboard shortcuts (⌘P, ⌘E, ⌘⇧B)
- Native title bar
- System-integrated (future: menu bar, notifications)

### Performance Matters
- Lazy loading (don't fetch all diffs upfront)
- Aggressive caching (SQLite for persistence)
- Virtual scrolling (for large file lists)

### Security First
- No Node.js access in renderer
- Token storage in system keychain
- Context isolation enabled

### Beautiful Code
- TypeScript strict mode
- Clear separation of concerns
- Meaningful names, not comments

## Common Gotchas

### Monaco in Electron
Monaco assets need proper serving. The Vite config handles this, but if you see blank editors, check:
1. DevTools console for 404s
2. Vite public directory setup
3. Monaco loader configuration

### GitHub API Rate Limits
- Authenticated: 5000 req/hour
- Unauthenticated: 60 req/hour
- GraphQL: complexity-based

**Solution**: Cache aggressively, show rate limit status.

### IPC Type Safety
TypeScript doesn't check across IPC boundaries. Document your contracts:
```typescript
// Main process
ipcMain.handle('github:fetch', async (_, repo: string) => { ... })

// Preload
github: {
  fetch: (repo: string) => ipcRenderer.invoke('github:fetch', repo)
}
```

## Testing Strategy (Future)

Not implemented yet, but here's the plan:
- **Unit tests**: Services, utils (Vitest)
- **Component tests**: React Testing Library
- **Integration tests**: IPC handlers (Electron)
- **E2E tests**: Full app flows (Playwright)

## Deployment (Future)

When ready to ship:
```bash
npm run build
```

This creates installers in `release/`:
- **macOS**: `.dmg`
- **Windows**: `.exe` (NSIS)
- **Linux**: `.AppImage`

## Resources

- **Electron Docs**: https://www.electronjs.org/docs
- **Monaco API**: https://microsoft.github.io/monaco-editor/
- **GitHub API**: https://docs.github.com/en/rest
- **GitHub GraphQL**: https://docs.github.com/en/graphql

## Summary

You now have a **production-ready skeleton** for a forensic diff viewer. The architecture is solid, the UI is styled, and the patterns are established. All that's left is implementing the features one by one.

The codebase is:
- ✓ Type-safe
- ✓ Well-structured
- ✓ Documented
- ✓ Ready to scale

**Start with GitHub auth, then build feature by feature. Each step is well-defined in DEVELOPMENT.md.**

Good luck! 🚀
