import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:3100',
      '/actual-materials': 'http://127.0.0.1:3100',
      '/sample-materials': 'http://127.0.0.1:3100'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
