# WhoDidIt Quick Reference

## Installation & Setup

```bash
npm install                    # Install dependencies
npm run dev                    # Start development mode
npm run build                  # Build for production
```

## Project Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server + Electron |
| `npm run build` | Build app for production |
| `npm run preview` | Preview production build |
| `npm run electron:dev` | Build and run Electron only |
| `npm run electron:build` | Create distributable packages |

## File Structure Cheat Sheet

```
📁 electron/               → Main process code
  ├── main.ts             → GitHub API, auth, caching
  └── preload.ts          → Secure IPC bridge

📁 src/
  📁 components/          → React UI
    ├── AppShell.tsx      → Top bar + layout
    ├── FileList.tsx      → Changed files panel
    ├── DiffView.tsx      → Monaco diff editor
    └── DetailPanel.tsx   → Details/Blame/Explain tabs
  
  📁 services/            → API layer
    ├── github.ts         → GitHub API calls
    └── llm.ts            → LLM explanations
  
  📁 stores/              → State management
    └── appStore.ts       → Zustand store
  
  📁 types/               → TypeScript types
    └── index.ts          → Core domain types
  
  📁 utils/               → Helpers
    ├── keyboard.ts       → Shortcut manager
    ├── diff.ts           → Diff parsing/analysis
    └── format.ts         → Formatting utilities
```

## Key Keyboard Shortcuts (Planned)

| Shortcut | Action |
|----------|--------|
| `⌘P` / `Ctrl+P` | Quick file search |
| `⌘⇧B` / `Ctrl+Shift+B` | Toggle blame view |
| `⌘E` / `Ctrl+E` | Explain selection |
| `[` | Previous hunk |
| `]` | Next hunk |
| `⌘,` / `Ctrl+,` | Settings |

## Core Types Reference

```typescript
// Repository
interface Repo {
  id: string
  owner: string
  name: string
  fullName: string
  defaultBranch: string
}

// Git reference (branch/tag/commit)
interface GitRef {
  name: string
  type: 'branch' | 'tag' | 'commit'
  sha: string
}

// Comparison between two refs
interface Comparison {
  id: string
  repo: Repo
  baseRef: GitRef
  headRef: GitRef
  createdAt: string
  files: FileChange[]
  commits: Commit[]
}

// Changed file
interface FileChange {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  additions: number
  deletions: number
  oldSha?: string
  newSha?: string
  patch?: string
}
```

## State Management (Zustand)

```typescript
// Access state in components
import { useAppStore } from '../stores/appStore'

function MyComponent() {
  const { currentRepo, selectFile } = useAppStore()
  
  return <div onClick={() => selectFile(file)}>
    {currentRepo?.name}
  </div>
}
```

## IPC Communication Pattern

```typescript
// 1. Define in main process (electron/main.ts)
ipcMain.handle('github:fetch', async (_event, repo: string) => {
  // Implementation
  return result
})

// 2. Expose in preload (electron/preload.ts)
contextBridge.exposeInMainWorld('electronAPI', {
  github: {
    fetch: (repo: string) => ipcRenderer.invoke('github:fetch', repo)
  }
})

// 3. Call from renderer (src/services/github.ts)
const result = await window.electronAPI.github.fetch(repo)
```

## Monaco Diff Editor Usage

```typescript
import { DiffEditor } from '@monaco-editor/react'

<DiffEditor
  height="100%"
  language="typescript"
  original={oldContent}
  modified={newContent}
  theme="vs-dark"
  options={{
    renderSideBySide: true,
    readOnly: true,
    minimap: { enabled: true },
    fontSize: 13,
    lineNumbers: 'on'
  }}
/>
```

## GitHub API Patterns

### REST API (via Octokit)
```typescript
import { Octokit } from '@octokit/rest'

const octokit = new Octokit({ auth: token })

// Compare two refs
const { data } = await octokit.repos.compareCommits({
  owner: 'org',
  repo: 'repo',
  base: 'main',
  head: 'feature'
})

// Get file content
const { data } = await octokit.repos.getContent({
  owner: 'org',
  repo: 'repo',
  path: 'src/file.ts',
  ref: 'commit-sha'
})
```

### GraphQL API (for Blame)
```typescript
import { graphql } from '@octokit/graphql'

const result = await graphql(`
  query($owner: String!, $repo: String!, $ref: String!, $path: String!) {
    repository(owner: $owner, name: $repo) {
      object(expression: $ref) {
        ... on Commit {
          file(path: $path) {
            object {
              ... on Blob {
                blame {
                  ranges {
                    startingLine
                    endingLine
                    commit { oid author { name email date } message }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`, {
  owner: 'org',
  repo: 'repo',
  ref: 'main:src/file.ts',
  path: 'src/file.ts',
  headers: { authorization: `token ${token}` }
})
```

## Styling Guidelines

- **Colors**: Match VS Code dark theme
  - Background: `#1e1e1e`, `#252526`, `#2d2d30`
  - Text: `#cccccc`
  - Accents: `#007acc` (blue), `#10b981` (green), `#ef4444` (red)
  - Borders: `#3c3c3c`, `#555`

- **Spacing**: Consistent 8px grid
  - Small: `4px`, `8px`
  - Medium: `12px`, `16px`
  - Large: `24px`, `32px`

- **Typography**:
  - Sans: `-apple-system, BlinkMacSystemFont, 'Segoe UI'`
  - Mono: `'SF Mono', Monaco, 'Cascadia Code'`
  - Sizes: `11px` (small), `13px` (default), `14px` (headers)

## Common Tasks

### Add a New Component
1. Create `src/components/MyComponent.tsx`
2. Create `src/components/MyComponent.css`
3. Export from component file
4. Import in parent component

### Add State to Store
```typescript
// In src/stores/appStore.ts
interface AppState {
  myNewState: string
  setMyNewState: (value: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  myNewState: '',
  setMyNewState: (value) => set({ myNewState: value }),
}))
```

### Add a New IPC Handler
1. Add handler in `electron/main.ts`
2. Expose in `electron/preload.ts`
3. Add TypeScript types for Window interface
4. Use in service layer

## Debug Tips

### View Electron Logs
```bash
npm run dev
# Main process logs → Terminal
# Renderer logs → DevTools (opens automatically)
```

### Check IPC Traffic
```bash
DEBUG=electron* npm run dev
```

### Monaco Issues
- Check DevTools console for 404s
- Verify Vite config handles Monaco assets
- Ensure editor container has height

## Performance Best Practices

1. **Lazy Load**: Don't fetch all file contents upfront
2. **Cache**: Use SQLite for persistent cache
3. **Virtual Scroll**: For large file lists (>100 files)
4. **Debounce**: User input (search, filters)
5. **Web Workers**: Heavy computations (diff parsing)

## Security Checklist

- [x] Context isolation enabled
- [x] Node integration disabled in renderer
- [x] Preload script for IPC bridge
- [ ] Secure token storage (use system keychain)
- [ ] Validate all user input
- [ ] Sanitize external content (commit messages, etc.)

## Next Implementation Steps

1. **GitHub Auth** (OAuth Device Flow)
2. **Repo Selection** (Octokit + searchable list)
3. **Ref Comparison** (GitHub Compare API)
4. **Real Diffs** (Fetch file contents)
5. **Blame** (GraphQL API + Monaco decorations)
6. **AI Explanations** (LLM integration + caching)

## Useful Links

- [Electron IPC](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Monaco API Docs](https://microsoft.github.io/monaco-editor/api/index.html)
- [GitHub REST API](https://docs.github.com/en/rest)
- [GitHub GraphQL Explorer](https://docs.github.com/en/graphql/overview/explorer)
- [Octokit.js](https://octokit.github.io/rest.js/)
- [Zustand Docs](https://docs.pmnd.rs/zustand/getting-started/introduction)

## Getting Help

1. Check `DEVELOPMENT.md` for architecture details
2. Check `PROJECT_SUMMARY.md` for overview
3. Search GitHub API docs
4. Check Monaco Editor examples
5. Review existing component patterns

---

**Remember**: This is a desktop app, not a website. Think IDE, not web UI.
