import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import seo from './scripts/seo.js';

export default defineConfig({
  base: './',
  plugins: [react(), seo()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787'
    }
  }
});