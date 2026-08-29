/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'favicon.ico'],
      workbox: {
        // Cache all static assets with Cache First strategy
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            // Catálogo y configuración pública: stale-while-revalidate (4h)
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/v1/catalog') ||
              url.pathname.startsWith('/api/v1/config'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-public-cache',
              expiration: {
                maxAgeSeconds: 60 * 60 * 4, // 4 hours
                maxEntries: 50,
              },
            },
          },
          {
            // API protegida (rutas, clientes, pedidos): Network First con fallback
            urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-protected-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxAgeSeconds: 60 * 60, // 1 hour fallback
                maxEntries: 100,
              },
            },
          },
          {
            // Imágenes de productos: Cache First (24h)
            urlPattern: ({ url }) => url.pathname.startsWith('/images/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'product-images-cache',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
                maxEntries: 200,
              },
            },
          },
        ],
      },
      manifest: {
        name: 'SIGLO ERP - SMG',
        short_name: 'SIGLO',
        description: 'Sistema Integral de Gestión Logística y Operaciones para SMG Distribuidora',
        theme_color: '#1A3C5E',
        background_color: '#0F1C2E',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'es',
        icons: [
          {
            src: 'icons/192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_SIGLO_API_URL || 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    target: 'ES2020',
    sourcemap: true,
  },
  test: {
    environment: 'happy-dom',
  },
});
