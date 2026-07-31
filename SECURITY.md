# Security notes

## npm audit: accepted advisories

### react-router — GHSA-qwww-vcr4-c8h2 (RSC Mode CSRF Bypass)

- **Affects:** `react-router` 7.12.0 – 8.2.0 (installed: `react-router-dom` 7.18.2)
- **Risk accepted:** This advisory only affects React Router's **RSC (React Server
  Components) framework mode**. This application is a classic client-side SPA
  using `BrowserRouter` and does not use RSC/`framework` mode, so the advisory is
  **not exploitable** here.
- **Why not "fixed":** npm's automated `npm audit fix --force` answer is a
  *downgrade* to `react-router-dom@7.11.0` (loses ~6 minor releases of fixes), and
  the upstream fix requires migrating to `react-router` v8 (the `react-router-dom`
  package is removed in v8, requiring import changes in ~57 files).
- **Revisit when:** migrating to React Router v8, or if this app ever adopts RSC
  framework mode.

## How vulnerabilities were resolved

- `npm audit fix` (non-breaking): axios, postcss, undici, ws, fast-uri, etc.
- Removed unused `@vite-pwa/assets-generator` dependency (killed the `sharp` advisory
  chain; it was an optional peer of `vite-plugin-pwa` and unused in the codebase).
- Added a scoped `overrides` block (`jake → filelist → minimatch → brace-expansion:
  ^5.0.9`) to force the fixed version in the build-time `workbox-build → ejs` chain.
- The `source-map@0.8.0-beta.0` / `glob@11.1.0` deprecation warnings come from
  `workbox-build` (required by `vite-plugin-pwa`) — informational only, not
  vulnerabilities.

Run `npm audit` to confirm the current state.

## BE project (BE-AI-Based-ecomm-Laravel)

Left unchanged by decision. `npm audit` reports 3 advisories (1 low, 1 moderate,
1 high) from the `vite 4 / esbuild / laravel-vite-plugin` dev toolchain. These are
**dev-server-only** vulnerabilities (e.g. `server.fs.deny` bypass, esbuild dev
server request reading) and are not exploitable in production builds. Fixing them
requires upgrading vite to ^8 + laravel-vite-plugin to ^3.x, which is a breaking
toolchain change.
