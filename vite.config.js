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
    /* No manualChunks. Hand-splitting vendors (react / recharts / etc.) into
       separate chunks created cross-chunk circular references that crashed at
       runtime with "Cannot access 'X' before initialization" (a TDZ on a module
       const used before its chunk finished initializing). Letting Rollup do its
       automatic chunking keeps circularly-dependent modules correctly ordered.
       Route-level code-splitting (React.lazy/dynamic import) is unaffected, so
       lazy page loading still works. */
    rollupOptions: {},
  },
});
