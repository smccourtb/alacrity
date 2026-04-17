import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    host: '0.0.0.0',
    // Pin the port so Tauri's devUrl is always correct. `strictPort: true`
    // makes Vite fail fast instead of falling back to 5174/5175 when 5178
    // is in use — a silent fallback would cause Tauri to load whichever
    // other project is squatting on 5173.
    port: 5178,
    strictPort: true,
    // Bun hardlinks workspace packages across worktrees, so realpath()
    // resolves dependencies to paths outside the current worktree.
    fs: { strict: false },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        timeout: 0,
        xfwd: true,
      },
    },
  },
})
