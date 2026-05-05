// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/tbcare-app/',  // ← MUST match your GitHub repo name exactly

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // ← This tells vite-plugin-pwa where your icons live (public/icons/)
      includeAssets: ['icons/*.png', 'favicon.ico'],

      manifest: {
        name: 'TB Care',
        short_name: 'TBCare',
        description: 'Tuberculosis treatment companion app',
        theme_color: '#0b5070',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/tbcare-app/',   // ← MUST have the /tbcare-app/ prefix
        scope: '/tbcare-app/',
        base: '/tbcare-app/',       // ← same here
        icons: [
          { src: 'icons/tbcare-icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/tbcare-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },

      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/tbcare-app/index.html',  // ← subpath here too
        navigateFallbackAllowlist: [/^\/tbcare-app/],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      },

      devOptions: {
        enabled: true  // lets you test PWA install in dev mode
      }
    })
  ]
})