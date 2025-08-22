import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"], // evita que esbuild toque los iconos
  },
  build: {
    chunkSizeWarningLimit: 2000 // aumenta el límite a 2MB
  }
});