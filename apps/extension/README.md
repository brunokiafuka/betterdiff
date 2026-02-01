## BetterDiff GitHub Extension

Chrome MV3 extension that adds a BetterDiff button to GitHub file pages.

### Build

```bash
# From repo root
pnpm build:extension

# Or with watch mode
pnpm dev:extension
```

### Install (local)

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select `apps/extension/dist`.

### Behavior

- Shows an "Open in BetterDiff" button on GitHub `blob`, `blame`, and `compare` pages.
- Opens the BetterDiff web app with `path` and commit refs when available.
- For compare pages, extracts base and head refs from the URL.

### Configuration

The BetterDiff base URL is defined in `src/open.ts` as `BETTERDIFF_BASE_URL`.

### Manual Test Checklist

- [ ] Open a repo file page (`/blob/`) and confirm the button appears.
- [ ] Click the button and confirm it opens BetterDiff with `path` set.
- [ ] Check a branch name with slashes and confirm the URL is still valid.
- [ ] Open a blame page (`/blame/`) and confirm the button appears.
- [ ] Open a compare page (`/compare/`) and confirm the button appears with base/head refs.
- [ ] Navigate between files without full reload and confirm no duplicates.

### Known Issues

- On refresh, the page may collapse the file tree, this is caused by turbo:render firing on many DOM updates including file tree expand/collapse, which causes our re-injection to trigger file tree collapse.
