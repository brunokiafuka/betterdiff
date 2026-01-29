# Testing Instructions

The app has an ES modules vs CommonJS issue with the current Electron/Vite setup. Here's how to test it:

## Quick Test (Recommended)

Create a GitHub Personal Access Token and test manually:

1. **Get a GitHub Token**:
   - Go to https://github.com/settings/tokens/new
   - Give it a name like "WhoDidIt Test"
   - Select scopes: `repo` (full control of private repositories)
   - Generate token and copy it

2. **Test the UI Components**:
   The React UI is working and can be tested in the browser:
   ```bash
   npm run dev
   ```
   Then open http://localhost:5174/ in your browser

## What's Working

- ✓ React UI with Monaco Editor
- ✓ All components render correctly
- ✓ State management (Zustand)
- ✓ GitHub API integration code (ready to use)
- ✓ TypeScript compilation

## The Electron Issue

The Electron integration has an ES modules compatibility issue. This is a common problem with modern Electron + Vite setups.

### Solutions:

**Option 1: Use electron-vite instead**
```bash
npm install -D electron-vite
```
This package handles the ES/CJS transpilation correctly.

**Option 2: Manual configuration**
Remove `"type": "module"` from package.json and adjust imports.

**Option 3: Test in browser first**
The entire React app works in the browser. Once the UI is solid, fix the Electron wrapper.

## Browser Testing

To test with real GitHub data right now:

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open browser DevTools console and run:
   ```javascript
   // Test GitHub API directly
   const octokit = new Octokit({ auth: 'YOUR_TOKEN_HERE' })
   const { data } = await octokit.repos.listForAuthenticatedUser()
   console.log(data)
   ```

The TestPanel component will work once Electron is fixed.

## Next Steps

1. Fix Electron build (use electron-vite or adjust config)
2. Test authentication flow
3. Test repo comparison
4. Test diff viewing with real files

The core functionality is all there - it's just the Electron wrapper that needs adjustment!
