import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/tbcare-app/',  // ← CHANGE THIS to your exact repo name
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      base: '/tbcare-app/',  // ← same here
      manifest: {
        name: 'TB Care',
        short_name: 'TBCare',
        theme_color: '#0ea5e9',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/tbcare-app/',  // ← and here
        icons: [
          { src: '/tbcare-app/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/tbcare-app/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})