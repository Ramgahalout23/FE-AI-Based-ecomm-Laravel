/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons.svg'],
        manifest: {
          name: 'THREVOLT | Premium Streetwear',
          short_name: 'THREVOLT',
          description: 'Premium streetwear e-commerce store',
          theme_color: '#0a0a0a',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: 'icons.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // ── Runtime Caching ──
          runtimeCaching: [
            {
              // Cache only GET API responses with StaleWhileRevalidate — serves instantly from cache
              // while fetching fresh data in the background. Short TTL to prevent stale data.
              // Uses a function pattern to filter only GET requests (not POST/PUT/DELETE).
              urlPattern: ({ url, request }) =>
                url.pathname.startsWith('/api/') &&
                request.method === 'GET',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 120, // 2 minutes — short TTL prevents stale data on reconnects
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Cache uploaded images/static assets with CacheFirst for fast loads.
              // Moderate TTL — admin can update images, so don't cache for too long.
              urlPattern: /^\/(uploads|storage)\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'image-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 24 * 60 * 60, // 24 hours (was 7 days)
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Cache Google Fonts with CacheFirst (long TTL — fonts rarely change)
              urlPattern: /^https?:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },

      }),
    ],

    // ★ Production build output goes to 'dist/' folder
    // These files will be copied into Laravel's 'public/' folder
    base: isProduction ? '/' : '/',

    server: {
      port: 5173,
      // ★ PROXY for Local Development:
      // React Vite dev server (port 5173) will forward /api requests
      // to Laravel dev server (port 8000 via php artisan serve)
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/storage': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },

    build: {
      // ★ Output directory — contents will go to Laravel's public/
      outDir: 'dist',
      // ★ Generate manifest.json for Laravel to reference assets
      manifest: true,
      // ★ Generate sourcemaps only in dev mode
      sourcemap: !isProduction,
      rollupOptions: {
        output: {
          // ★ Consistent file naming for cache busting
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },

    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/__tests__/setup.js'],
    },
  }
})
