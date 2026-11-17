import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, Vite corre en :5173 y redirige /api y /imagenes al servidor Express (:3001)
export default defineConfig({
  base: '/BadBrain3D/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/imagenes': 'http://localhost:3001'
    }
  }
});
