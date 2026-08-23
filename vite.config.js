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
      // Only enable PWA service worker in production — in dev mode it
      // intercepts cross-origin requests (Unspash images, fonts, etc.)
      // triggering CORB warnings in the console.
      ...(isProduction
        ? [VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'icons.svg'],
            manifest: {
              name: process.env.VITE_STORE_NAME
                ? `${process.env.VITE_STORE_NAME} | Premium Streetwear`
                : 'THREVOLT | Premium Streetwear',
              short_name: process.env.VITE_STORE_NAME || 'THREVOLT',
              description: `${process.env.VITE_STORE_NAME || 'THREVOLT'} — Premium streetwear e-commerce store`,
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
              // Serve index.html for SPA navigations EXCEPT /api/ paths.
              // Without this denylist, the service worker intercepts the Google
              // OAuth callback navigation (…/api/v1/auth/google/callback) and
              // returns the SPA shell instead of letting it reach the API,
              // breaking social login with a React 404 page.
              navigateFallback: 'index.html',
              navigateFallbackDenylist: [/^\/api\//],
              runtimeCaching: [
                // Admin API — NEVER cache (network only). Admin data must always
                // come fresh from the server; a stale cached 403/500 causes confusing
                // blank pages when the token is refreshed but old errors persist.
                {
                  urlPattern: ({ url, request }) =>
                    url.pathname.startsWith('/api/v1/admin/') &&
                    request.method === 'GET' &&
                    request.mode !== 'navigate',
                  handler: 'NetworkOnly',
                },
                // Public storefront API — cache-first with background revalidation
                {
                  urlPattern: ({ url, request }) =>
                    url.pathname.startsWith('/api/') &&
                    request.method === 'GET' &&
                    request.mode !== 'navigate',
                  handler: 'StaleWhileRevalidate',
                  options: {
                    cacheName: 'api-cache',
                    expiration: {
                      maxEntries: 50,
                      maxAgeSeconds: 120,
                    },
                    cacheableResponse: {
                      statuses: [0, 200],
                    },
                  },
                },
                {
                  urlPattern: /^\/(uploads|storage)\/.*/i,
                  handler: 'StaleWhileRevalidate',
                  options: {
                    cacheName: 'image-cache',
                    expiration: {
                      maxEntries: 100,
                      maxAgeSeconds: 24 * 60 * 60,
                    },
                    cacheableResponse: {
                      statuses: [0, 200],
                    },
                  },
                },
                {
                  urlPattern: /^https?:\/\/fonts\.googleapis\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'google-fonts-cache',
                    expiration: {
                      maxEntries: 10,
                      maxAgeSeconds: 30 * 24 * 60 * 60,
                    },
                    cacheableResponse: {
                      statuses: [0, 200],
                    },
                  },
                },
              ],
            },
          })]
        : []
      ),
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
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          // Return JSON error instead of HTML so CORB doesn't block the response
          configure: (proxy) => {   
            proxy.on('proxyReq', (proxyReq) => {
              // Ensure the proxied request has JSON accept header
              proxyReq.setHeader('Accept', 'application/json');
            });
            proxy.on('proxyRes', (proxyRes) => {
              // Ensure the response has proper JSON Content-Type even for errors
              if (proxyRes.statusCode >= 400) {
                if (!proxyRes.headers['content-type']) {
                  proxyRes.headers['content-type'] = 'application/json; charset=utf-8';
                }
              }
            });
            proxy.on('error', (err, req, res) => {
              // Return JSON error when backend is unreachable (prevents CORB from HTML error pages)
              res.writeHead(502, {
                'Content-Type': 'application/json; charset=utf-8',
              });                res.end(JSON.stringify({
                success: false,
                message: 'Backend server is not available. Please ensure the Node.js server is running on port 3000.',
              }));
            });
          },
        },
        '/uploads': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          ws: true,
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
          // ★ Split vendor libs into separate chunks for better caching.
          // Rolldown (Vite 8) ignores `manualChunks` — use `advancedChunks`
          // groups instead. Groups capture a module AND its dependencies
          // recursively, so `priority` matters: React's shared internals
          // (e.g. __CLIENT_INTERNALS) must be claimed by the react group
          // BEFORE the charts group can sweep them into the recharts chunk.
          // Otherwise the ~350 kB charts chunk gets pulled into the
          // storefront's INITIAL bundle (verified in the network waterfall).
          advancedChunks: {
            groups: [
              // React ecosystem — changes rarely, great for long-term caching
              { name: 'vendor-react', test: /node_modules\/react(\/|$)/, priority: 100 },
              { name: 'vendor-dom', test: /node_modules\/(react-dom|scheduler)(\/|$)/, priority: 100 },
              { name: 'vendor-router', test: /node_modules\/react-router(\/|$)/, priority: 100 },
              { name: 'vendor-helmet', test: /node_modules\/react-helmet(\/|$)/, priority: 100 },
              { name: 'vendor-query', test: /node_modules\/@tanstack\/react-query(\/|$)/, priority: 100 },
              // Large UI libraries — split individually
              { name: 'vendor-framer', test: /node_modules\/(framer-motion|motion|motion-dom|motion-utils)(\/|$)/, priority: 100 },
              // recharts' deps that OTHER code (zustand, react-query, router…)
              // also uses — claim them BEFORE the charts group can sweep them
              // into the charts chunk (which pulls the whole chunk into the
              // storefront initial bundle). Keep each in its own small chunk so
              // it only loads with whichever feature needs it.
              { name: 'vendor-usest', test: /node_modules\/use-sync-external-store(\/|$)/, priority: 95 },
              { name: 'vendor-es-toolkit', test: /node_modules\/es-toolkit(\/|$)/, priority: 95 },
              { name: 'vendor-chart-deps', test: /node_modules\/(clsx|eventemitter3|tiny-invariant|decimal\.js-light|immer|reselect|react-redux|@reduxjs\/toolkit)(\/|$)/, priority: 95 },
              // Chart library only — low priority so shared modules stay out
              { name: 'vendor-charts', test: /node_modules\/(recharts|victory-vendor)(\/|$)/, priority: 50 },
              // Socket.io + engine.io — only needed for authenticated users
              // (realtime notifications/chat), imported lazily by App.jsx. Keep
              // out of the initial bundle for anonymous storefront visitors.
              { name: 'vendor-socketio', test: /node_modules\/(socket\.io-client|engine\.io-client|@socket\.io)(\/|$)/, priority: 100 },
              { name: 'vendor-barcode', test: /node_modules\/@zxing(\/|$)/, priority: 100 },
              // Everything else in one vendor bundle
              { name: 'vendor', test: /node_modules\//, priority: 10 },
            ],
          },
        },
      },
    },

    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/__tests__/setup.js'],
      // E2E specs run under Playwright, not vitest
      exclude: ['node_modules/**', 'e2e/**', 'dist/**'],
    },
  }
})
