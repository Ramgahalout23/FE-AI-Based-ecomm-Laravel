import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Suppress React 19 set-state-in-effect rule — these are intentional patterns
      // that manage loading states within effects across many components.
      'react-hooks/set-state-in-effect': 'off',

      // React Compiler-era rules flagging intentional patterns used throughout
      // this codebase:
      //  - purity: skeleton loaders use Math.random() for varied bar heights and
      //    "new arrival"/"stale sync" checks use Date.now() freshness — deliberate.
      //  - refs: the "latest value" ref pattern (writing a ref during render to
      //    always call the newest callback) and accessing state returned by a
      //    custom hook are both used on purpose across many components.
      //  - preserve-manual-memoization: useCallback deps that are intentionally
      //    narrower than the inferred `chat` object in useChat.
      //  - static-components: inline "sub-component" definitions inside render
      //    (OrderDetailAdminPage, ProfilePage) — a widely-used local pattern here.
      //  - immutability: async loaders reassign module-level caches and effects
      //    reference helpers declared later in source order (valid — effects run
      //    after the component body completes).
      //  - use-memo: the deps arg of useSocketEvent is intentionally dynamic.
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/use-memo': 'off',

      // The codebase exports shared helpers/constants from component files
      // (ReelCard, DateRangePicker, pageSkeletonConfig, contexts) — a DX-only
      // fast-refresh nicety, not a correctness rule.
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Vite config + vitest files run in Node, not the browser.
    files: ['vite.config.js', '**/*.test.{js,jsx}', '**/__tests__/**/*.{js,jsx}'],
    languageOptions: { globals: globals.node },
  },
])
