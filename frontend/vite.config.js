import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base public path when serving or building the project.
  // Defaults to '/', but can be overridden with VITE_BASE_PATH when deploying under a subpath.
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})