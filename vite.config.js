import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: false,
    watch: {
      usePolling: true,
      interval: 800,
      ignored: ['**/node_modules/**', '**/.git/**', '**/src/assets/**']
    }
  }
});
