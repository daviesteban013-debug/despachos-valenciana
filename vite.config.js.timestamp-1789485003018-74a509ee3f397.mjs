// vite.config.js
import { defineConfig } from "file:///C:/Users/USUARIO/logistica%20despachos/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/USUARIO/logistica%20despachos/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Users/USUARIO/logistica%20despachos/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "logo-valenciana.png", "robots.txt"],
      manifest: {
        name: "La Valenciana FERREHOGAR - WMS Despachos",
        short_name: "Valenciana WMS",
        description: "Control log\xEDstico y despacho para La Valenciana FERREHOGAR",
        theme_color: "#dc2626",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/logo-valenciana.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/logo-valenciana.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"]
      }
    })
  ],
  server: {
    port: 3e3,
    open: false,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true
      }
    },
    watch: {
      usePolling: true,
      interval: 800,
      ignored: ["**/node_modules/**", "**/.git/**", "**/src/assets/**"]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxVU1VBUklPXFxcXGxvZ2lzdGljYSBkZXNwYWNob3NcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXFVTVUFSSU9cXFxcbG9naXN0aWNhIGRlc3BhY2hvc1xcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvVVNVQVJJTy9sb2dpc3RpY2ElMjBkZXNwYWNob3Mvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5pY28nLCAnbG9nby12YWxlbmNpYW5hLnBuZycsICdyb2JvdHMudHh0J10sXG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiAnTGEgVmFsZW5jaWFuYSBGRVJSRUhPR0FSIC0gV01TIERlc3BhY2hvcycsXG4gICAgICAgIHNob3J0X25hbWU6ICdWYWxlbmNpYW5hIFdNUycsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQ29udHJvbCBsb2dcdTAwRURzdGljbyB5IGRlc3BhY2hvIHBhcmEgTGEgVmFsZW5jaWFuYSBGRVJSRUhPR0FSJyxcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjZGMyNjI2JyxcbiAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogJyMwZjE3MmEnLFxuICAgICAgICBkaXNwbGF5OiAnc3RhbmRhbG9uZScsXG4gICAgICAgIG9yaWVudGF0aW9uOiAncG9ydHJhaXQnLFxuICAgICAgICBzdGFydF91cmw6ICcvJyxcbiAgICAgICAgaWNvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzcmM6ICcvbG9nby12YWxlbmNpYW5hLnBuZycsXG4gICAgICAgICAgICBzaXplczogJzE5MngxOTInLFxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXG4gICAgICAgICAgICBwdXJwb3NlOiAnYW55IG1hc2thYmxlJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiAnL2xvZ28tdmFsZW5jaWFuYS5wbmcnLFxuICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxuICAgICAgICAgICAgcHVycG9zZTogJ2FueSBtYXNrYWJsZSdcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICB3b3JrYm94OiB7XG4gICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Z30nXVxuICAgICAgfVxuICAgIH0pXG4gIF0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDMwMDAsXG4gICAgb3BlbjogZmFsc2UsXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjMwMDEnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWVcbiAgICAgIH1cbiAgICB9LFxuICAgIHdhdGNoOiB7XG4gICAgICB1c2VQb2xsaW5nOiB0cnVlLFxuICAgICAgaW50ZXJ2YWw6IDgwMCxcbiAgICAgIGlnbm9yZWQ6IFsnKiovbm9kZV9tb2R1bGVzLyoqJywgJyoqLy5naXQvKionLCAnKiovc3JjL2Fzc2V0cy8qKiddXG4gICAgfVxuICB9XG59KTtcblxuXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXdTLFNBQVMsb0JBQW9CO0FBQ3JVLE9BQU8sV0FBVztBQUNsQixTQUFTLGVBQWU7QUFFeEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFBLE1BQ2QsZUFBZSxDQUFDLGVBQWUsdUJBQXVCLFlBQVk7QUFBQSxNQUNsRSxVQUFVO0FBQUEsUUFDUixNQUFNO0FBQUEsUUFDTixZQUFZO0FBQUEsUUFDWixhQUFhO0FBQUEsUUFDYixhQUFhO0FBQUEsUUFDYixrQkFBa0I7QUFBQSxRQUNsQixTQUFTO0FBQUEsUUFDVCxhQUFhO0FBQUEsUUFDYixXQUFXO0FBQUEsUUFDWCxPQUFPO0FBQUEsVUFDTDtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFlBQ04sU0FBUztBQUFBLFVBQ1g7QUFBQSxVQUNBO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsWUFDTixTQUFTO0FBQUEsVUFDWDtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUCxjQUFjLENBQUMsZ0NBQWdDO0FBQUEsTUFDakQ7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxZQUFZO0FBQUEsTUFDWixVQUFVO0FBQUEsTUFDVixTQUFTLENBQUMsc0JBQXNCLGNBQWMsa0JBQWtCO0FBQUEsSUFDbEU7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
