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
        // Solo cachear assets pequeños: JS/CSS/HTML/imágenes estáticas
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Excluir el inventario JSON grande del precache del service worker
        globIgnores: ['**/inventario.json'],
        // Aumentar límite a 4 MiB para el chunk principal
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // El inventario se cachea en runtime via CacheFirst (no precache)
        runtimeCaching: [
          {
            urlPattern: /\/inventario\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'inventario-cache',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 7 } // 7 dias
            }
          }
        ]
      }
    })
  ],
  build: {
    // Code splitting para reducir el chunk principal
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/@react-oauth')) {
            return 'vendor-google';
          }
          if (id.includes('node_modules/xlsx') || id.includes('node_modules/exceljs')) {
            return 'vendor-excel';
          }
        }
      }
    },
    // Aumentar el warning threshold a 1 MB
    chunkSizeWarningLimit: 1000
  },
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
