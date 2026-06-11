import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Le service worker se met à jour tout seul quand tu déploies une nouvelle version.
      registerType: 'autoUpdate',
      // Fichiers à inclure dans le cache en plus de ceux générés par le build.
      includeAssets: ['apple-touch-icon.png', 'favicon-32.png'],
      // Le manifeste : c'est lui qui rend l'app installable.
      manifest: {
        name: 'TrackReport',
        short_name: 'TrackReport',
        description: 'Suivez toutes vos candidatures en un seul endroit.',
        lang: 'fr',
        theme_color: '#4F46E5',
        background_color: '#FBFBF8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // Mise en cache de l'app (le "shell") pour qu'elle se charge hors ligne.
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
      },
      // Permet de tester la PWA même en mode développement (npm run dev).
      devOptions: {
        enabled: true,
      },
    }),
  ],
})