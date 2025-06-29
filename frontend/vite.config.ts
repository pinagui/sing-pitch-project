import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    // Enable source maps for better debugging
    sourcemap: true,
    // Target modern browsers to reduce polyfills
    target: 'es2020',
    // Optimize bundle size
    minify: true,
    // Code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          icons: ['lucide-react']
        }
      }
    },
    // Reduce chunk size limit warnings
    chunkSizeWarningLimit: 1000
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts', 'lucide-react']
  }
}) 