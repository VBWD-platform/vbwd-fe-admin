import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  root: './vue',
  envDir: resolve(__dirname),
  plugins: [vue()],
  base: '/admin/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'vue/src'),
      '@plugins': resolve(__dirname, 'plugins')
    },
    // Ensure single instances of vue and pinia across all packages
    dedupe: ['vue', 'pinia', 'vue-router']
  },
  server: {
    allowedHosts: true,
    hmr: {
      path: '/__vite_hmr',
      clientPort: 8081,
    },
    proxy: {
      '/api': {
        // IPv4 literal (not "localhost") — in CI Node resolves "localhost" to
        // ::1 while the backend binds IPv4, so the proxy can't reach it and the
        // dev server falls through to index.html (breaks e2e login). Overridable
        // via VITE_BACKEND_URL, mirroring vbwd-fe-user.
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  // Optimize deps to ensure proper module resolution
  optimizeDeps: {
    include: ['pinia', 'vue', 'vue-router', 'vbwd-view-component']
  }
})
