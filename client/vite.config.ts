import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import lezer from 'unplugin-lezer/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    lezer(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@demo/server': path.resolve(__dirname, '../server/src'),
    },
  },
  server: {
    proxy: {
      '/trpc': 'http://localhost:3000',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: [
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/language',
            '@codemirror/commands',
            '@codemirror/autocomplete',
            '@codemirror/lint',
            '@codemirror/search',
            '@lezer/highlight',
            '@lezer/lr',
          ],
        },
      },
    },
  },
})
