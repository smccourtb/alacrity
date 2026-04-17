import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    host: '0.0.0.0',
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
