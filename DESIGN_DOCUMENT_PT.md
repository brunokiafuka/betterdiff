# 📊 BetterDiff / WhoDidIt - Design Document Completo

## 🎯 Visão Geral da Aplicação

**BetterDiff** (também conhecido como **WhoDidIt**) é uma aplicação de visualização de diffs de Git de próxima geração, projetada para forensic analysis (análise forense) de mudanças em repositórios. A aplicação permite que desenvolvedores comparem dois pontos qualquer no histórico Git e vejam não apenas o que mudou, mas também QUEM mudou, QUANDO mudou e POR QUÊ.

### Propósito Principal
Fornecer uma ferramenta visual e inteligente para analisar mudanças em código Git com funcionalidades avançadas como:
- Visualização de diffs lado a lado com editor Monaco
- Blame (atribuição) inteligente com contexto de commits
- Explicações de mudanças alimentadas por IA
- Análise de "hotspots" em arquivos (quais arquivos mais mudam)
- Suporte para GitHub e repositórios locais

---

## 🏗️ Arquitetura Geral

### Estrutura de Monorepo com pnpm workspaces

```
betterdiff/
├── apps/
│   ├── desktop/        ← Aplicação Electron (Desktop)
│   └── web/            ← Aplicação Web (Convex + React)
├── packages/           ← Pacotes compartilhados (futuros)
├── docs/               ← Documentação
└── scripts/            ← Scripts de utilidade
```

### Dois Aplicativos Paralelos

1. **Desktop (`apps/desktop/`)** - Aplicação Electron
   - Interface nativa para macOS/Windows/Linux
   - Acesso direto a repositórios locais
   - Integração com GitHub API
   - Estado gerenciado com Zustand

2. **Web (`apps/web/`)** - Aplicação Web
   - Interface web (pode ser hospedada)
   - Integração com Convex (backend serverless)
   - Autenticação via GitHub OAuth
   - Análise de repositórios remotos do GitHub

---

## 🖥️ APLICAÇÃO DESKTOP (Electron + React + TypeScript)

### Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Desktop** | Electron | ^28.2.0 |
| **UI Framework** | React | ^18.2.0 |
| **Linguagem** | TypeScript | ^5.3.3 |
| **State Management** | Zustand | ^4.5.0 |
| **Editor** | Monaco Editor | ^4.6.0 |
| **GitHub API** | Octokit | ^20.0.2 |
| **Build Tool** | Electron Vite | ^5.0.0 |
| **Database Local** | better-sqlite3 | ^9.3.0 |
| **Diff Parser** | diff | ^5.2.0 |

### Estrutura de Arquivos Desktop

```
apps/desktop/
├── electron/                  ← Processo Principal (Node.js)
│   ├── main.ts               ← Entry point do Electron, gerencia janelas e IPC
│   └── preload.ts            ← Script de segurança, expõe API safe para renderer
│
├── src/                       ← Código React (Renderer)
│   ├── App.tsx               ← Componente raiz
│   ├── main.tsx              ← Entry point React
│   ├── stores/
│   │   └── appStore.ts       ← State global (Zustand)
│   │
│   ├── components/           ← Componentes React
│   │   ├── AppShell.tsx      ← Shell principal com menu superior
│   │   ├── FileList.tsx      ← Lista de arquivos alterados
│   │   ├── DiffView.tsx      ← Editor Monaco com diffs
│   │   ├── DetailPanel.tsx   ← Painel direito (Details/Blame/Explain)
│   │   ├── FileDiffViewer.tsx
│   │   ├── BranchSelector.tsx
│   │   ├── CommitDetailsPanel.tsx
│   │   ├── FileExplorerView.tsx
│   │   ├── FileHistoryPanel.tsx
│   │   ├── FileTreePanel.tsx
│   │   ├── HotspotPanel.tsx  ← Análise de hotspots
│   │   ├── AIPanel.tsx       ← Painel de IA para explicações
│   │   ├── RepoSearchModal.tsx
│   │   ├── Settings.tsx      ← Configurações
│   │   ├── TestPanel.tsx
│   │   ├── Welcome.tsx       ← Tela inicial
│   │   └── [componentes].css ← Estilos (VS Code dark theme)
│   │
│   ├── services/             ← Lógica de negócio
│   │   ├── github.ts         ← Abstração de repositório e GitHub API
│   │   ├── llm.ts            ← Integração com LLM para IA
│   │   └── hotspot.ts        ← Análise de hotspots
│   │
│   ├── types/
│   │   ├── index.ts          ← Definições de tipos principais
│   │   ├── electron.d.ts     ← Tipos da API Electron
│   │
│   └── utils/                ← Funções auxiliares
│       ├── diff.ts           ← Parse e manipulação de diffs
│       ├── format.ts         ← Formatação (datas, paths, SHAs)
│       └── keyboard.ts       ← Gerenciamento de atalhos

├── dist-electron/            ← Build output do processo principal
├── vite.config.ts           ← Configuração Vite
├── electron.vite.config.ts  ← Configuração Electron Vite
└── tsconfig.json            ← Configuração TypeScript
```

### Fluxo de Dados - Desktop

```
┌─────────────────────────────────────────────────────┐
│          Electron Main Process (Node.js)            │
│  - GitHub API (Octokit)                             │
│  - Git CLI (execSync)                               │
│  - SQLite (better-sqlite3)                          │
│  - IPC Handlers                                     │
└────────────────────┬────────────────────────────────┘
                     │ IPC Events
                     ↓
┌─────────────────────────────────────────────────────┐
│        React Renderer (preload.ts bridge)           │
│  - window.electronAPI.*                             │
└────────────────────┬────────────────────────────────┘
                     │ Props/State
                     ↓
┌─────────────────────────────────────────────────────┐
│         Zustand Global Store (appStore.ts)          │
│  - currentRepo, baseRef, headRef                    │
│  - currentComparison, selectedFile                  │
│  - UI state (viewMode, rightPanelTab, etc)         │
└────────────────────┬────────────────────────────────┘
                     │ Subscribe/Selectors
                     ↓
┌─────────────────────────────────────────────────────┐
│           React Components (UI)                     │
│  - AppShell, FileList, DiffView, DetailPanel, etc  │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Tipos de Dados Principais (TypeScript)

### Core Types (`src/types/index.ts`)

```typescript
// Repositório
interface Repo {
  id: string
  owner: string
  name: string
  fullName: string                // "owner/name"
  defaultBranch: string            // "main"
  type: 'github' | 'local'
  localPath?: string               // Apenas para repos locais
}

// Referência Git (branch, tag, commit)
interface GitRef {
  name: string                     // "main", "v1.0.0", "abc123"
  type: 'branch' | 'tag' | 'commit'
  sha: string                      // Full commit SHA
}

// Comparação entre dois refs
interface Comparison {
  id: string
  repo: Repo
  baseRef: GitRef                  // "comparar a partir deste commit"
  headRef: GitRef                  // "até este commit"
  createdAt: string
  files: FileChange[]              // Quais arquivos mudaram
  commits: Commit[]                // Quais commits estão envolvidos
}

// Mudança em arquivo individual
interface FileChange {
  path: string                     // "src/components/App.tsx"
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  additions: number                // +42 linhas
  deletions: number                // -18 linhas
  oldSha?: string
  newSha?: string
  patch?: string                   // Unified diff format
}

// Commit
interface Commit {
  sha: string
  author: {
    name: string
    email: string
    date: string                   // ISO 8601
  }
  message: string
  prNumber?: number                // Se linked a PR no GitHub
}

// Blame - atribui linhas a commits
interface BlameChunk {
  startLine: number
  endLine: number
  commit: Commit                   // Quem modificou esta linha
}

// Explicação gerada por IA
interface Explanation {
  summary: string[]                // Sumário das mudanças
  behavioralChange: string         // Como muda o comportamento
  risks: string[]                  // Riscos potenciais
  testsToRun: string[]            // Testes sugeridos
  questions: string[]              // Perguntas para considerar
}

// Hotspot de arquivo (arquivo que muda muito)
interface HotspotFile {
  path: string
  changeCount: number              // Quantas vezes foi modificado
  churn: number                    // Linhas adicionadas + deletadas
  recencyScore: number             // Quão recente foi a mudança
  authorCount: number              // Quantos autores tocaram
  hotspotScore: number             // Score agregado (0-100)
  lastModified: string
  commits: string[]                // Array de SHAs de commits
}
```

### App Store State (Zustand)

```typescript
interface AppState {
  // Repo e refs selecionados
  currentRepo: Repo | null
  baseRef: GitRef | null
  headRef: GitRef | null
  
  // Dados da comparação atual
  currentComparison: Comparison | null
  selectedFile: FileChange | null
  
  // Estado de UI
  showBlame: boolean
  viewMode: 'side-by-side' | 'inline' | 'timeline'
  rightPanelTab: 'details' | 'blame' | 'explain' | 'hotspots'
  
  // Actions para mudar estado
  setRepo(repo: Repo): void
  setRefs(base: GitRef, head: GitRef): void
  setComparison(comparison: Comparison): void
  selectFile(file: FileChange): void
  toggleBlame(): void
  setViewMode(mode): void
  setRightPanelTab(tab): void
}
```

---

## 🎨 Layout e Componentes da UI - Desktop

### Layout de Três Painéis

```
┌─────────────────────────────────────────────────────────────┐
│  ⚡ WhoDidIt                                [🔥] [Explain] [⚙️]│
│  facebook/react ▾  Base: main ▾  →  Compare: feature ▾     │
└─────────────────────────────────────────────────────────────┘
┌──────────────┬───────────────────────────┬─────────────────┐
│              │                           │                 │
│  FILES       │  DIFF EDITOR              │  DETAILS PANEL  │
│  PANEL       │  (Monaco)                 │                 │
│              │                           │  [Details]      │
│ M src/a.ts   │  Old code │ New code      │  [Blame]        │
│   +42  -18   │ ──────────┼──────────     │  [Explain]      │
│              │           │ + new line    │  [Hotspots]     │
│ A src/b.ts   │   remove  │ + change      │                 │
│   +120  -0   │           │               │  Commit Info    │
│              │           │               │  Blame/History  │
│ D old/c.ts   │           │               │  AI Explanation │
│   +0  -215   │           │               │                 │
│              │           │               │                 │
│ (8 more)     │           │               │                 │
└──────────────┴───────────────────────────┴─────────────────┘
```

### Componentes Principais

#### 1. **AppShell** (`AppShell.tsx`)
- Barra superior com controles
- Seletor de repositório remoto
- Seletor de refs (base e head)
- Menu com opções (Blame, Explain, Settings)
- Gerencia abertura de modais

#### 2. **FileList** (`FileList.tsx`)
- Lista de arquivos alterados na comparação
- Mostra status (M/A/D/R) e estatísticas (+/-linhas)
- Seleção de arquivo para visualizar diff
- Filtro/busca de arquivos

#### 3. **DiffView** (`DiffView.tsx`)
- Integração com Monaco Editor
- Dois modos: side-by-side ou inline
- Syntax highlighting automático
- Gutter com blame (cores/nomes dos autores)
- Navegação entre mudanças

#### 4. **DetailPanel** (`DetailPanel.tsx`)
- Painel com abas tabbed (Details/Blame/Explain/Hotspots)
  - **Details**: Metadados do arquivo, commit info
  - **Blame**: Quem modificou cada linha, quando
  - **Explain**: Explicação IA do que mudou e por quê
  - **Hotspots**: Arquivos "quentes" (que mais mudam)

#### 5. **BranchSelector** (`BranchSelector.tsx`)
- Dropdown para selecionar branch/tag base
- Dropdown para selecionar branch/tag para comparar
- Atualiza estado global ao selecionar

#### 6. **CommitDetailsPanel** (`CommitDetailsPanel.tsx`)
- Informações do commit (SHA, autor, data, mensagem)
- Link para PR no GitHub se disponível
- Timeline de commits

#### 7. **RepoSearchModal** (`RepoSearchModal.tsx`)
- Modal para buscar e selecionar repositório
- Busca em repos do GitHub ou locais
- Mostra repos recentes

#### 8. **Settings** (`Settings.tsx`)
- Configurações da aplicação
- Token GitHub
- Diretório de repos locais
- Preferências de UI

#### 9. **HotspotPanel** (`HotspotPanel.tsx`)
- Análise de quais arquivos mudam mais
- Score de "hotspot" (baseado em churn, frequência, autores)
- Útil para identificar arquivos críticos/complexos

#### 10. **AIPanel** (`AIPanel.tsx`)
- Explicações geradas por IA (se conectado a LLM)
- Sumário das mudanças
- Análise de risco
- Testes sugeridos

---

## 🔌 IPC (Inter-Process Communication) - Desktop

O Electron usa IPC para comunicação segura entre processo principal e renderer.

### Handlers Disponíveis (electron/main.ts)

#### GitHub API
```javascript
// Autenticação
ipcMain.handle('github:auth', (token) => {
  // Autentica e valida token
  // Retorna { success, user, error }
})

// Buscar repositórios
ipcMain.handle('github:fetchRepos', () => {
  // Lista repos do usuário autenticado
  // Retorna Repo[]
})

// Listar branches de um repo
ipcMain.handle('github:listBranches', (owner, repo) => {
  // Retorna GitRef[]
})

// Comparar dois refs
ipcMain.handle('github:compareRefs', (owner, repo, baseRef, headRef) => {
  // Faz diff entre dois commits
  // Retorna { files: FileChange[], commits: Commit[] }
})

// Obter conteúdo do arquivo em um ref
ipcMain.handle('github:getFileContent', (owner, repo, ref, path) => {
  // Retorna string (conteúdo do arquivo)
})

// Blame de um arquivo
ipcMain.handle('github:getBlame', (owner, repo, ref, path) => {
  // Retorna BlameChunk[]
})
```

#### Git Local
```javascript
// Listar branches locais
ipcMain.handle('local:listBranches', (repoPath) => {
  // Executa: git branch -a
  // Retorna GitRef[]
})

// Comparar refs locais
ipcMain.handle('local:compareRefs', (repoPath, baseRef, headRef) => {
  // Executa: git diff baseRef...headRef
  // Retorna { files: FileChange[], commits: Commit[] }
})

// Conteúdo de arquivo em ref local
ipcMain.handle('local:getFileContent', (repoPath, ref, path) => {
  // Executa: git show ref:path
  // Retorna string
})

// Blame local
ipcMain.handle('local:getBlame', (repoPath, ref, path) => {
  // Executa: git blame ref path
  // Retorna BlameChunk[]
})
```

#### Config (Persistência)
```javascript
ipcMain.handle('config:read', () => {
  // Lê arquivo de config (SQLite ou JSON)
  // Retorna config object
})

ipcMain.handle('config:write', (config) => {
  // Salva config
})
```

### Bridge Seguro (preload.ts)

O `preload.ts` expõe apenas APIs aprovadas:

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  github: {
    auth: (token) => ipcRenderer.invoke('github:auth', token),
    fetchRepos: () => ipcRenderer.invoke('github:fetchRepos'),
    listBranches: (owner, repo) => 
      ipcRenderer.invoke('github:listBranches', owner, repo),
    compareRefs: (owner, repo, base, head) => 
      ipcRenderer.invoke('github:compareRefs', owner, repo, base, head),
    getFileContent: (owner, repo, ref, path) => 
      ipcRenderer.invoke('github:getFileContent', owner, repo, ref, path),
    getBlame: (owner, repo, ref, path) => 
      ipcRenderer.invoke('github:getBlame', owner, repo, ref, path),
  },
  local: {
    listBranches: (path) => 
      ipcRenderer.invoke('local:listBranches', path),
    compareRefs: (path, base, head) => 
      ipcRenderer.invoke('local:compareRefs', path, base, head),
    getFileContent: (path, ref, file) => 
      ipcRenderer.invoke('local:getFileContent', path, ref, file),
    getBlame: (path, ref, file) => 
      ipcRenderer.invoke('local:getBlame', path, ref, file),
  },
  config: {
    read: () => ipcRenderer.invoke('config:read'),
    write: (config) => ipcRenderer.invoke('config:write', config),
  },
})
```

---

## 🌐 APLICAÇÃO WEB (React + Convex)

### Stack Tecnológico Web

| Componente | Tecnologia | Versão |
|-----------|-----------|--------|
| **Framework** | React | ^19.2.0 |
| **Linguagem** | TypeScript | ~5.9.3 |
| **Backend** | Convex | ^1.31.6 |
| **Autenticação** | @convex-dev/auth | ^0.0.90 |
| **Router** | TanStack Router | ^1.157.14 |
| **Editor** | Monaco Editor | ^4.6.0 |
| **Analytcs** | PostHog | ^1.335.4 |
| **Build** | Vite | ^7.2.4 |

### Estrutura Web

```
apps/web/
├── convex/                       ← Backend Convex (serverless)
│   ├── auth.ts                   ← Autenticação GitHub OAuth
│   ├── auth.config.ts
│   ├── github.ts                 ← Integração com GitHub API (server-side)
│   ├── http.ts                   ← HTTP handlers
│   ├── schema.ts                 ← Definição do banco de dados
│   └── _generated/               ← Auto-gerado pelo Convex
│
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── router.tsx                ← Definição de rotas (TanStack Router)
│   ├── App.css
│   ├── index.css
│   │
│   ├── components/               ← Componentes React (similar ao Desktop)
│   │   ├── AppShell.tsx
│   │   ├── BranchSelector.tsx
│   │   ├── FileDiffViewer.tsx
│   │   ├── FileExplorerView.tsx
│   │   ├── FileHistoryPanel.tsx
│   │   └── ... (similar aos do Desktop)
│   │
│   ├── routes/                   ← Rotas (TanStack Router)
│   │   ├── index.tsx             ← Home/Login
│   │   ├── compare.tsx           ← Página de comparação
│   │   └── ...
│   │
│   ├── services/                 ← Integração com Convex
│   │   ├── github.ts
│   │   └── ...
│   │
│   ├── stores/                   ← State management
│   │
│   ├── types/
│   │
│   └── assets/

├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

### Fluxo Web

```
┌────────────────────────────────────────┐
│      React Browser Client              │
│  - TanStack Router para navegação      │
│  - Convex client hooks (useQuery, etc) │
└────────────────────┬───────────────────┘
                     │ HTTPS
                     ↓
┌────────────────────────────────────────┐
│      Convex Backend (Serverless)       │
│  - Funções mutation/query TypeScript   │
│  - GitHub API (via Octokit)            │
│  - Database (storage automático)       │
│  - Autenticação OAuth                  │
└────────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────┐
│      GitHub API                        │
│  - Fetch repos, branches, diffs        │
└────────────────────────────────────────┘
```

### Schema Convex (Database)

```typescript
// convex/schema.ts - Define tabelas e tipos
export default defineSchema({
  users: defineTable({
    tokenId: v.id("authSessions"),
    email: v.string(),
    name: v.string(),
    githubUsername: v.string(),
    githubToken: v.string(),
  }),
  
  comparisons: defineTable({
    userId: v.id("users"),
    repoOwner: v.string(),
    repoName: v.string(),
    baseRef: v.string(),
    headRef: v.string(),
    files: v.array(v.object({...})),
    commits: v.array(v.object({...})),
    createdAt: v.number(),
  }),
  
  savedAnalyses: defineTable({
    userId: v.id("users"),
    comparisonId: v.id("comparisons"),
    notes: v.string(),
    tags: v.array(v.string()),
  }),
})
```

---

## 🔄 Fluxos de Trabalho Principais

### 1. Autenticação com GitHub

**Desktop:**
```
1. Usuário clica "Connect GitHub"
2. AppShell → RepoSearchModal exibe instruções
3. Electron main process inicia OAuth Device Flow
4. Usuário autoriza em github.com
5. Token salvo em config (memoria ou keychain)
6. Octokit configurado com token
7. appStore atualizado
```

**Web:**
```
1. Usuário clica "Login with GitHub"
2. Convex redireciona para GitHub OAuth
3. GitHub redireciona back com código
4. Convex valida e troca por token
5. Session criada com JWT
6. User logado na aplicação
```

### 2. Comparar Dois Refs

**Fluxo Geral:**
```
1. Usuário seleciona repo → appStore.currentRepo atualizado
2. Usuário seleciona baseRef e headRef
3. BranchSelector → setRefs() chamado
4. Clica "Compare" ou muda refs
5. RepositoryService.compareRefs() chamado
6. IPC para main process (Desktop) ou Convex query (Web)
7. GitHub/Git retorna:
   - FileChange[] (quais arquivos mudaram)
   - Commit[] (quais commits estão envolvidos)
8. appStore.currentComparison atualizado
9. componentes re-renderizam com dados novos
```

### 3. Visualizar Diff de um Arquivo

```
1. Usuário clica arquivo em FileList
2. appStore.selectedFile atualizado
3. DiffView recebe arquivo selecionado
4. Se conteúdo não em cache, fetch:
   - RepositoryService.getFileContent(ref=base) → oldContent
   - RepositoryService.getFileContent(ref=head) → newContent
5. diff.js calcula o unified diff
6. Monaco DiffEditor renderiza lado-a-lado
7. Syntx highlighting automático pela extensão do arquivo
```

### 4. Visualizar Blame de um Arquivo

```
1. Usuário clica aba "Blame" em DetailPanel
2. rightPanelTab = 'blame'
3. Se dados não em cache:
   - RepositoryService.getBlame(repo, ref, path) chamado
   - Git blame executado (Git CLI)
   - BlameChunk[] retornado
4. Blame data renderizado em painel
5. Gutter no Monaco pode mostrar cores/nomes
```

### 5. Gerar Explicação com IA

```
1. Usuário clica "Explain" ou aba "Explain"
2. DetailPanel/AIPanel renderiza loading state
3. LLM service chamado com:
   - Diferença entre oldContent e newContent
   - Commit message (se disponível)
   - Contexto do arquivo (tipo, localização)
4. LLM retorna Explanation:
   - summary, behavioralChange, risks, testsToRun, questions
5. UI renderiza resposta formatada
6. (Opcional) Cachear resultado
```

### 6. Análise de Hotspots

```
1. Usuário clica aba "Hotspots" ou painel HotspotPanel
2. HotspotService analisa:
   - Quantas vezes cada arquivo foi modificado
   - Total de linhas (churn)
   - Quantos autores diferentes tocaram
   - Quão recente foi a última mudança
3. Score = f(changeCount, churn, authorCount, recency)
4. Files ordenados por hotspotScore (DESC)
5. Lista renderizada com ranking
6. Útil para: code review focus, refactoring priorities
```

---

## 🎨 Tema Visual - VS Code Dark

A aplicação usa paleta inspirada em VS Code:

```css
/* Backgrounds */
--bg-primary: #1e1e1e    /* Editor background */
--bg-secondary: #252526  /* Sidebar background */
--bg-tertiary: #2d2d30   /* Component background */
--bg-elevated: #37373d   /* Hover/selected background */

/* Text */
--text-primary: #cccccc   /* Normal text */
--text-secondary: #999999 /* Secondary text */
--text-muted: #666666     /* Disabled/faint text */

/* Accents */
--accent-blue: #007acc    /* Primary action, links */
--accent-green: #10b981   /* Additions, success */
--accent-red: #ef4444     /* Deletions, error */
--accent-orange: #f59e0b  /* Warning, info */
--accent-purple: #a855f7  /* Renamed files */

/* Borders */
--border-light: #3c3c3c
--border-medium: #555555
```

---

## 🛠️ Ferramentas de Desenvolvimento

### Atalhos de Teclado

```
⌘/Ctrl + O          → Abrir repositório remoto (GitHub)
⌘/Ctrl + Shift + O  → Abrir repositório local
⌘/Ctrl + ,          → Settings
⌘/Ctrl + A          → Abrir painel de IA
⌘/Ctrl + E          → Abrir explorador de arquivos
⌘/Ctrl + P          → Buscar arquivo/painel
F1                  → Command palette
```

### Utilidades de Diff

**diffUtils.ts:**
- Parse unified diff format
- Extract file changes from patch
- Calculate line additions/deletions
- Diff statistics

**formatUtils.ts:**
- Format dates (commits)
- Format file paths
- Format commit SHAs (short vs full)
- Format numbers (line counts)

**keyboardUtils.ts:**
- Register app-wide shortcuts
- Focus management
- Keyboard event handling

---

## 📊 Estado da Aplicação - Zustand Store

```typescript
// Seleções do usuário
currentRepo: Repo | null                    // Repo selecionado
baseRef: GitRef | null                      // "comparar DE"
headRef: GitRef | null                      // "comparar PARA"

// Dados carregados
currentComparison: Comparison | null        // Resultado do diff
selectedFile: FileChange | null             // Arquivo clicado

// UI State
showBlame: boolean                          // Gutter de blame ativo?
viewMode: 'side-by-side'|'inline'|'timeline'
rightPanelTab: 'details'|'blame'|'explain'|'hotspots'

// Derived/Computed (opcional)
// - Pode-se usar selectors do Zustand para calcular:
//   const selectedFileContent = useAppStore(state => 
//     state.currentComparison?.files.find(f => f.path === state.selectedFile?.path)
//   )
```

---

## 🚀 Recursos Implementados vs Planejados

### ✅ Implementado

- [x] Estrutura base Electron + React + TypeScript
- [x] Layout de 3 painéis (Files, DiffView, DetailPanel)
- [x] Integração Monaco Editor (diff viewer)
- [x] Zustand state management
- [x] IPC bridge seguro (preload)
- [x] Tipos TypeScript robustos
- [x] Styling (VS Code dark theme)
- [x] Componentes base (AppShell, BranchSelector, etc)
- [x] Service layer para GitHub/Local repos

### 🔄 Em Desenvolvimento

- [ ] Autenticação GitHub OAuth (Device Flow)
- [ ] Carregar dados reais do GitHub (repos, branches, diffs)
- [ ] Blame implementation
- [ ] LLM integration (explicações IA)
- [ ] Hotspot analysis
- [ ] Persistência local (SQLite)
- [ ] Performance otimization (caching, virtualization)

### 🔮 Futuro

- [ ] Web app (Convex + React)
- [ ] Autenticação multi-provider
- [ ] Histórico completo de comparações
- [ ] Compartilhamento de análises
- [ ] CI/CD integration
- [ ] Browser extension

---

## 🏃 Como Rodar

### Desktop

```bash
# Instalar dependências
pnpm install

# Dev mode (hot reload)
pnpm run dev:desktop

# Build
pnpm run build:desktop
```

### Web

```bash
# Dev
cd apps/web
pnpm dev

# Build
pnpm build
```

---

## 📁 Estrutura de Pastas - Resumo Visual

```
betterdiff/
│
├── 📦 apps/
│   ├── 💻 desktop/              (Aplicação Electron)
│   │   ├── electron/            (Main process)
│   │   ├── src/                 (React renderer)
│   │   │   ├── components/      (UI components)
│   │   │   ├── services/        (GitHub, LLM, Hotspot)
│   │   │   ├── stores/          (Zustand)
│   │   │   ├── types/           (TypeScript)
│   │   │   └── utils/           (Helpers)
│   │   └── dist-electron/       (Build output)
│   │
│   └── 🌐 web/                  (Aplicação React + Convex)
│       ├── convex/              (Backend serverless)
│       ├── src/
│       │   ├── components/
│       │   ├── routes/
│       │   ├── services/
│       │   └── ...
│       └── ...
│
├── 📚 docs/
│   ├── DESIGN.md                (Mockups visuais)
│   ├── DEVELOPMENT.md           (Setup dev)
│   ├── PROJECT_SUMMARY.md       (Overview projeto)
│   ├── QUICKSTART.md            (Quick start)
│   └── TESTING.md               (Testing guide)
│
├── 📦 packages/                 (Pacotes shared - futuro)
├── 🔧 scripts/                  (Utilitários)
│
├── pnpm-workspace.yaml          (Monorepo config)
├── package.json                 (Root manifest)
└── README.md                    (Intro)
```

---

## 🎯 Objetivos do Projeto

1. **Análise Forense de Git**: Entender não só O QUÊ mudou, mas QUEM, QUANDO, POR QUÊ
2. **Developer Experience**: Interface visual intuitiva e poderosa
3. **IA-Powered**: Explicações automáticas com LLM
4. **Multi-Plataforma**: Desktop (Electron) + Web
5. **Performance**: Smooth UI mesmo com repos grandes
6. **Developer-Friendly**: TypeScript, bem estruturado, fácil de estender

---

## 📝 Conclusão

**BetterDiff** é uma ferramenta forensic de Git que combina:
- 📊 Visualização moderna (Monaco Editor)
- 🔍 Atribuição inteligente (Blame)
- 🤖 Explicações por IA
- 🎯 Análise de hotspots
- 🖥️ Desktop + Web

Arquitetura limpa com separação clara entre:
- **Renderer** (React UI) ↔ **Main** (Node logic) [Desktop]
- **Client** (React UI) ↔ **Backend** (Convex) [Web]

Pronta para expansão e adição de novas features!
