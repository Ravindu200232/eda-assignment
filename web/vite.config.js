/*
 * File:    vite.config.js
 * Module:  Core (build set-up)
 * Owner:   Ravindu
 * Purpose: Vite build settings, the Tailwind plugin and the Vitest unit test settings.
 * Source:  WEB-02 (Vite React set-up and build options), WEB-03 (Tailwind with Vite), WEB-12 (Vitest).
 */
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    rolldownOptions: {
      output: {
        // React and the router change rarely, so browsers can keep them cached between releases.
        codeSplitting: {
          groups: [{ name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ }],
        },
        // Code shared by several pages gets a clear name instead of one of its file names.
        chunkFileNames: (chunk) =>
          chunk.isDynamicEntry || chunk.name === 'react' ? 'assets/[name]-[hash].js' : 'assets/shared-[hash].js',
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true,
  },
})
