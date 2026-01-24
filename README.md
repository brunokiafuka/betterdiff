# WhoDidIt

A forensic diff viewer with blame, compare, and AI explanations.

## Core Features

- **Compare Mode**: View diffs between any two Git refs (commits, branches, tags)
- **Smart Blame**: Attribution with commit context and PR links
- **AI Explanations**: Understand what changed and why it matters
- **Monaco Editor**: Full-featured diff editor with syntax highlighting
- **GitHub Integration**: Works directly with GitHub repositories

## Architecture

- **Electron + React**: Desktop-grade UX with modern web technologies
- **Monaco Editor**: VS Code's diff editor
- **Zustand**: Lightweight state management
- **Octokit**: GitHub API integration
- **TypeScript**: Full type safety

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Development

The app is structured in three main layers:

1. **Main Process** (`electron/main.ts`): GitHub API, authentication, caching
2. **Preload** (`electron/preload.ts`): Secure IPC bridge
3. **Renderer** (`src/`): React UI with Monaco, components, and state management

## Project Structure

```
whodidit/
├── electron/           # Electron main process
├── src/
│   ├── components/    # React components
│   ├── stores/        # Zustand state management
│   ├── services/      # API services
│   └── types/         # TypeScript types
└── package.json
```

## Roadmap

- [ ] GitHub OAuth authentication
- [ ] Repository and ref selection
- [ ] Diff viewing with Monaco
- [ ] Blame annotations via GraphQL
- [ ] AI-powered explanations
- [ ] Saved comparisons
- [ ] PR context integration

## License

MIT
