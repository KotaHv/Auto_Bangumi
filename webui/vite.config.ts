import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      injectRegister: false,
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'AutoBangumi',
        display: 'standalone',
        short_name: 'AutoBangumi',
        description: 'Automated Bangumi Download Tool',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/images/logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/images/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/images/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  build: {
    cssCodeSplit: false,
    rolldownOptions: {
      output: {
        minify:
          mode === 'production'
            ? {
                compress: {
                  dropConsole: true,
                  dropDebugger: true,
                },
              }
            : undefined,
      },
    },
  },
  resolve: {
    alias: {
      '~': import.meta.dirname,
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '^/api/.*': {
        target: 'http://127.0.0.1:7892',
        changeOrigin: false,
      },
      '^/posters/.*': 'http://127.0.0.1:7892',
    },
  },
}));
