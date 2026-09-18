import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo-valenciana.png', 'robots.txt'],
      manifest: {
        name: 'La Valenciana FERREHOGAR - WMS Despachos',
        short_name: 'Valenciana WMS',
        description: 'Control logístico y despacho para La Valenciana FERREHOGAR',
        theme_color: '#dc2626',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/logo-valenciana.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/logo-valenciana.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  server: {
    port: 3000,
    strictPort: true,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    },
    watch: {
      usePolling: true,
      interval: 800,
      ignored: ['**/node_modules/**', '**/.git/**', '**/src/assets/**']
    }
  }
});


