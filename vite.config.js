import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        /* Function form so chart libs are bundled TOGETHER with their transitive
           deps. The old object form isolated `recharts` alone while its deps
           (d3-*, react-smooth, victory-vendor, internmap, decimal.js-light) fell
           into other chunks — that cross-chunk circular reference produced the
           runtime "Cannot access 'X' before initialization" (TDZ) crash. Keeping
           them in one chunk fixes it. Unmatched modules return undefined so
           Rollup keeps its default chunking for everything else. */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('framer-motion')) return 'vendor-framer';
          if (
            id.includes('recharts') ||
            id.includes('d3-') ||
            id.includes('react-smooth') ||
            id.includes('victory-vendor') ||
            id.includes('internmap') ||
            id.includes('decimal.js-light') ||
            id.includes('fast-equals')
          ) return 'vendor-charts';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('lucide-react')) return 'vendor-lucide';
          if (
            id.includes('/react-dom/') ||
            id.includes('/react/') ||
            id.includes('/scheduler/')
          ) return 'vendor-react';
          return undefined;
        },
      },
    },
  },
});
