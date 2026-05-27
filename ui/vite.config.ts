import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Docker Desktop serves extension files via a custom protocol that doesn't
// send CORS headers, so <script type="module" crossorigin> silently fails.
// Convert module scripts to deferred classic scripts and strip crossorigin.
const stripModuleType: Plugin = {
  name: 'strip-module-type',
  apply: 'build',
  transformIndexHtml(html) {
    return html
      .replace(/ type="module"/g, ' defer')
      .replace(/ crossorigin/g, '');
  },
};

export default defineConfig({
  base: './',
  plugins: [react(), stripModuleType],
  server: {
    proxy: {
      '/temporal-api': {
        target: 'http://127.0.0.1:8233',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/temporal-api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'assets/index-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
