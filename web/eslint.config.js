/*
 * File:    eslint.config.js
 * Module:  Core (code quality)
 * Owner:   Ravindu
 * Purpose: Lint rules for the web app. Browser code, unit tests and the
 *          Node-based config and end-to-end files each get the right globals.
 * Source:  WEB-02 (Vite React template).
 */
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.e2e-dist', 'playwright-report', 'test-results']),
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
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
  {
    // Test helpers, context files and the route table export more than components on purpose.
    files: ['src/test/**', 'src/**/*.test.{js,jsx}', 'src/context/**', 'src/routes/router.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['*.config.js', 'e2e/**/*.js'],
    languageOptions: { globals: globals.node },
  },
])
