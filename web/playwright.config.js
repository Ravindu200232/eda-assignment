/*
 * File:    playwright.config.js
 * Module:  End-to-end tests
 * Owner:   Ravindu
 * Purpose: Browser tests against the real API and a throw-away MongoDB
 *          database. Playwright starts the API on port 5090 (with demo data in
 *          a new database) and a production build of the web app on port 5174,
 *          runs the tests one after another, and removes the database at the end.
 * Usage:   npm run e2e             (all tests except screenshots)
 *          npm run e2e:screens     (saves page screenshots for the report)
 * Source:  WEB-13 (Playwright webServer, globalTeardown and projects).
 */
import { defineConfig, devices } from '@playwright/test'

const API_PORT = 5090
const WEB_PORT = 5174

// The screenshot run shows the real Google map when web/.env.local has a key. Normal test
// runs use OpenStreetMap, so they do not depend on Google or use the key's free quota.
// E2E_MAPS_PROVIDER=osm also takes the screenshots with OpenStreetMap (for example when the
// key does not allow http://localhost:5174).
const screenshotRun = process.argv.includes('@screens') && !process.argv.includes('--grep-invert')
const mapsProvider = process.env.E2E_MAPS_PROVIDER || (screenshotRun ? 'auto' : 'osm')

// Worker processes read the same values, so they are kept in environment variables.
process.env.E2E_DB_NAME ??= `SolarGridDb_WebE2E_${Date.now()}`
process.env.E2E_API_URL ??= `http://localhost:${API_PORT}`
process.env.E2E_WEB_URL ??= `http://localhost:${WEB_PORT}`

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  globalTeardown: './e2e/global-teardown.js',
  use: {
    baseURL: process.env.E2E_WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      name: 'API',
      command: 'dotnet run --project ../api/src/SolarGrid.Api/SolarGrid.Api.csproj --no-launch-profile',
      url: `${process.env.E2E_API_URL}/api/health`,
      timeout: 240_000,
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ASPNETCORE_URLS: process.env.E2E_API_URL,
        MongoDb__DatabaseName: process.env.E2E_DB_NAME,
        App__SeedDemoData: 'true',
        Cors__AllowedOrigins__3: `http://localhost:${WEB_PORT}`,
      },
    },
    {
      // The tests use a production build, the same code that is deployed to IIS.
      name: 'Web',
      command: `npx vite build --outDir .e2e-dist --emptyOutDir && npx vite preview --outDir .e2e-dist --port ${WEB_PORT} --strictPort`,
      url: process.env.E2E_WEB_URL,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        VITE_API_URL: process.env.E2E_API_URL,
        VITE_MAPS_PROVIDER: mapsProvider,
      },
    },
  ],
})
