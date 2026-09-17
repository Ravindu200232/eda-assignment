/*
 * File:    screens.js
 * Module:  End-to-end tests (report screenshots)
 * Owner:   Ravindu
 * Purpose: Shared helpers for the screenshot run (npm run e2e:screens).
 *          Every screenshot test runs once at desktop size and once at phone
 *          size, and saves full-page images to docs/screenshots/web/.
 * Source:  WEB-13 (Playwright screenshots, tags and test.use).
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from '@playwright/test'

export const SCREEN_SIZES = [
  { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
]

export const SCREENSHOT_DIR = fileURLToPath(new URL('../../docs/screenshots/web/', import.meta.url))

// Declares the same screenshot tests for every screen size (tagged @screens).
export function screenTests(title, body) {
  for (const size of SCREEN_SIZES) {
    test.describe(`${title} (${size.name})`, { tag: '@screens' }, () => {
      test.use(size.use)
      body(size.name)
    })
  }
}

// Saves a full-page picture as docs/screenshots/web/<size>/<name>.png.
export async function shoot(page, size, name) {
  const folder = join(SCREENSHOT_DIR, size)
  mkdirSync(folder, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForLoadState('networkidle')
  const path = join(folder, `${name}.png`)
  await page.screenshot({ path, fullPage: true, animations: 'disabled' })
  return path
}
