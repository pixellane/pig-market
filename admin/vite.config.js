import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxyConfig = {
  '/api': {
    target: 'http://127.0.0.1:5000',
    changeOrigin: true,
    secure: false,
  },
  '/uploads': {
    target: 'http://127.0.0.1:5000',
    changeOrigin: true,
    secure: false,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: true,
    proxy: proxyConfig,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    proxy: proxyConfig,
  },
});
