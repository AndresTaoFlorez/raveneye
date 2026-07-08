import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    allowedHosts: ['host.docker.internal'],
    proxy: {
      '/api': 'http://127.0.0.1:8090',
      '/health': 'http://127.0.0.1:8090',
      '/status': 'http://127.0.0.1:8090',
    },
  },
});
