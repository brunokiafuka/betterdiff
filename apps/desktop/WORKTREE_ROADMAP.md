# Worktree Implementation Roadmap
(nao esquecer de documentar, tudo de forma clara.)

This checklist tracks the planned implementation for Git worktrees.

Metadata
- Owner: TBD
- Priority: TBD
- Target start: TBD
- Target finish: TBD

Legend
- [ ] Not started
- [~] In progress
- [x] Done

## 1) Backend contracts and validations (IPC)
- [x] Define strict `WorktreeAddOptions` and validate inputs in `electron/main.ts`.
  - Owner:
  - Priority:
  - Target date:
- [x] Map Git error messages to clear UI errors (branch in use, path exists, dirty worktree).
  - Owner:
  - Priority:
  - Target date:
- [x] Ensure `git worktree list --porcelain` parsing is robust.
  - Owner:
  - Priority:
  - Target date:
- [x] Ensure path/argument quoting for all `git worktree` commands.
  - Owner:
  - Priority:
  - Target date:

## 2) Renderer API surface
- [x] Add typed interfaces for `WorktreeInfo` and `WorktreeAddOptions`.
  - Owner:
  - Priority:
  - Target date:
- [x] Add service wrapper for `window.electronAPI.local.worktree*` calls.
  - Owner:
  - Priority:
  - Target date:

## 3) UI/UX (Worktrees management)
- [x] Add a Worktrees panel (list + actions).
  - Owner:
  - Priority:
  - Target date:
- [x] Add "Create Worktree" modal with options:
  - [x] Path (required)
  - [x] Branch (optional)
  - [x] Commit (optional)
  - [x] Detach / Orphan flags (mutually exclusive)
  - [x] Track / Guess-remote flags (optional)
  - [x] Lock + Reason
  - [x] No-checkout flag
  - Owner:
  - Priority:
  - Target date:
- [x] Hook up global loading/toasts for all actions.
  - Owner:
  - Priority:
  - Target date:

## 4) Critical flows (error-proof)
- [x] Validate incompatible flags (detach vs branch vs orphan).
  - Owner:
  - Priority:
  - Target date:
- [x] Block remove if dirty unless `force`.
  - Owner:
  - Priority:
  - Target date:
- [ ] Block move if locked unless `force`.
  - Owner:
  - Priority:
  - Target date:
- [x] Support prune dry-run.
  - Owner:
  - Priority:
  - Target date:

## 5) Manual test checklist
- [ ] Add worktree with new branch.
  - Owner:
  - Priority:
  - Target date:
- [ ] Add worktree with existing branch already checked out (expect error).
  - Owner:
  - Priority:
  - Target date:
- [ ] Add worktree with `--detach`.
  - Owner:
  - Priority:
  - Target date:
- [ ] Remove clean worktree.
  - Owner:
  - Priority:
  - Target date:
- [ ] Remove dirty worktree with and without `--force`.
  - Owner:
  - Priority:
  - Target date:
- [ ] Move worktree (locked vs unlocked).
  - Owner:
  - Priority:
  - Target date:
- [ ] Prune with `--dry-run`.
  - Owner:
  - Priority:
  - Target date:
- [ ] List shows locked/prunable states correctly.
  - Owner:
  - Priority:
  - Target date:
