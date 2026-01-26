import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Ensure convex is resolved from a single location to avoid duplicate instances
    dedupe: ['convex', 'react', 'react-dom'],
  },
})
