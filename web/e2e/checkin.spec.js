/*
 * File:    checkin.spec.js
 * Module:  Operator Check-in - end-to-end tests
 * Owner:   Ravindu
 * Purpose: A Grid Operator checks booking QR codes (typed, USB scanner or a
 *          pretend webcam) and completes an energy transfer. Forged and
 *          early codes are refused with the API's reason.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { writeQrVideo } from './fake-camera'
import { WEB_URL, api, apiLogin, findReservation, loginAs, openFromMenu } from './helpers'

// Types (or "scans") a code into the check-in box; scanners end with Enter.
async function scanCode(page, code) {
  const box = page.getByLabel('QR code text')
  await box.fill(code)
  await box.press('Enter')
}

test.describe('QR check-in', () => {
  let adminToken

  test.beforeEach(async ({ page, request }) => {
    adminToken = await apiLogin(request, 'admin')
    await loginAs(page, 'operator')
    await openFromMenu(page, 'QR check-in')
    await expect(page.getByRole('heading', { name: 'QR check-in' })).toBeVisible()
  })

  test('an approved booking in its time window is completed', async ({ page, request }) => {
    // RSV-DEMO-0006 is approved for the next Malabe slot, so check-in is open now.
    const booking = await findReservation(request, adminToken, 'RSV-DEMO-0006')
    const qr = await api(request, adminToken, 'GET', `/reservations/${booking.id}/qr`)

    await scanCode(page, qr.payload)
    await expect(page.getByText('Ready to transfer')).toBeVisible()
    await expect(page.getByText('Nadeesha Silva (995671234V)')).toBeVisible()
    await expect(page.getByText('SLIIT Malabe Campus Microgrid')).toBeVisible()

    await page.getByLabel('Delivered energy (kWh)').fill('3.8')
    await page.getByRole('button', { name: 'Complete transfer' }).click()
    await page.getByRole('dialog', { name: 'Complete this transfer?' }).getByRole('button', { name: 'Complete transfer' }).click()

    await expect(page.getByRole('heading', { name: 'Transfer completed' })).toBeVisible()
    await expect(page.getByText('RSV-DEMO-0006 completed with 3.8 kWh.')).toBeVisible()
    await expect(page.getByText('Completed this session')).toBeVisible()

    const saved = await api(request, adminToken, 'GET', `/reservations/${booking.id}`)
    expect(saved.status).toBe('Completed')
    expect(saved.deliveredKwh).toBe(3.8)

    // The same code cannot be used twice.
    await page.getByRole('button', { name: 'Scan next code' }).click()
    await scanCode(page, qr.payload)
    await expect(page.getByText('Cannot complete yet')).toBeVisible()
    await expect(page.getByText('This booking has already been completed.')).toBeVisible()
  })

  test('a booking that starts later cannot be checked in yet', async ({ page, request }) => {
    // RSV-DEMO-0002 starts at least 14 hours from now.
    const booking = await findReservation(request, adminToken, 'RSV-DEMO-0002')
    const qr = await api(request, adminToken, 'GET', `/reservations/${booking.id}/qr`)

    await scanCode(page, qr.payload)

    await expect(page.getByText('Cannot complete yet')).toBeVisible()
    await expect(page.getByText(/^Check-in for this booking opens at /)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Complete transfer' })).toHaveCount(0)
  })

  test('forged and unknown codes are refused', async ({ page, request }) => {
    const booking = await findReservation(request, adminToken, 'RSV-DEMO-0002')
    const qr = await api(request, adminToken, 'GET', `/reservations/${booking.id}/qr`)
    const forged = `${qr.payload.slice(0, qr.payload.lastIndexOf('.') + 1)}Zm9yZ2VkLXNpZ25hdHVyZQ`

    await scanCode(page, forged)
    await expect(page.getByRole('alert')).toContainText('This QR code is not genuine.')

    await scanCode(page, 'https://example.com/not-a-booking')
    await expect(page.getByRole('alert')).toContainText('This is not a Smart Solar booking QR code.')
  })

  test('an empty box is not sent to the API', async ({ page }) => {
    await page.getByRole('button', { name: 'Check code' }).click()
    await expect(page.getByRole('alert')).toContainText('Scan or paste the QR code first.')
  })
})

test('the camera reads a booking QR code', async ({ playwright, request }) => {
  const adminToken = await apiLogin(request, 'admin')
  const booking = await findReservation(request, adminToken, 'RSV-DEMO-0002')
  const qr = await api(request, adminToken, 'GET', `/reservations/${booking.id}/qr`)

  // Chromium plays this video as its webcam. The full Chromium build is needed:
  // the lighter headless shell has no camera support.
  const folder = mkdtempSync(join(tmpdir(), 'solargrid-camera-'))
  const video = writeQrVideo(qr.payload, join(folder, 'qr.y4m'))
  const browser = await playwright.chromium.launch({
    channel: 'chromium',
    args: ['--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${video}`],
  })

  try {
    const context = await browser.newContext({
      baseURL: WEB_URL,
      viewport: { width: 1280, height: 900 },
      permissions: ['camera'],
    })
    const page = await context.newPage()
    await loginAs(page, 'operator')
    await openFromMenu(page, 'QR check-in')

    await page.getByRole('button', { name: 'Scan with camera' }).click()
    await expect(page.getByRole('dialog', { name: 'Scan with camera' })).toBeVisible()

    // The dialog closes by itself once the code was read and checked.
    await expect(page.getByRole('dialog', { name: 'Scan with camera' })).toBeHidden({ timeout: 20_000 })
    await expect(page.getByLabel('QR code text')).toHaveValue(qr.payload)
    await expect(page.getByText('RSV-DEMO-0002')).toBeVisible()
    await expect(page.getByText('Cannot complete yet')).toBeVisible()
  } finally {
    await browser.close()
    rmSync(folder, { recursive: true, force: true })
  }
})
