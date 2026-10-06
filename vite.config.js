import { defineConfig } from 'vite';

// base './' => dist/ works from any static host or sub-path (GitHub Pages, Netlify, file server).
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: { manualChunks: { three: ['three'], post: ['postprocessing', 'n8ao'] } }
    }
  }
});
