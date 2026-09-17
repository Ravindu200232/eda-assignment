/*
 * File:    screens-reservations.spec.js
 * Module:  Energy Reservations - report screenshots
 * Owner:   Hamnad
 * Purpose: Screenshots of the booking list, the booking wizard, an approved
 *          booking with its QR code and a pending booking (run with
 *          npm run e2e:screens).
 */
import { expect, test } from '@playwright/test'
import { apiLogin, findReservation, loginAs } from './helpers'
import { screenTests, shoot } from './screens'

screenTests('reservations', (size) => {
  test('booking list', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/#/reservations?tab=all')
    await expect(page.getByRole('link', { name: 'RSV-DEMO-0002', exact: true })).toBeVisible()
    await shoot(page, size, '40-reservations')
  })

  test('booking wizard', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/#/reservations/new')
    await page.getByLabel('Find the prosumer').fill('Kasun')
    await page.getByRole('list', { name: 'Matching prosumers' }).getByRole('button', { name: /^Kasun Perera/ }).click()
    await page.getByRole('radiogroup', { name: 'Station' }).getByRole('radio', { name: 'Kandy Lakeside Energy Node' }).check()
    await page.getByRole('radiogroup', { name: 'Day' }).getByRole('radio').nth(1).check()
    await page.getByRole('radiogroup', { name: 'Free slots' }).getByRole('radio').first().check()
    await page.getByLabel('Energy (kWh)').fill('10')
    await page.getByRole('radio', { name: 'Export' }).check()
    await expect(page.getByRole('button', { name: 'Book this slot' })).toBeEnabled()
    await shoot(page, size, '41-booking-wizard')
  })

  test('booking pages', async ({ page, request }) => {
    const token = await apiLogin(request, 'admin')
    const approved = await findReservation(request, token, 'RSV-DEMO-0002')
    const pending = await findReservation(request, token, 'RSV-DEMO-0003')
    await loginAs(page, 'admin')

    await page.goto(`/#/reservations/${approved.id}`)
    await expect(page.getByRole('img', { name: 'QR code for RSV-DEMO-0002' })).toBeVisible()
    await shoot(page, size, '42-reservation-details')

    await page.getByRole('button', { name: 'Cancel booking' }).click()
    await expect(page.getByRole('dialog', { name: 'Cancel this booking?' })).toBeVisible()
    await shoot(page, size, '43-cancel-booking')
    await page.getByRole('dialog').getByRole('button', { name: 'Keep booking' }).click()

    await page.goto(`/#/reservations/${pending.id}`)
    await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeVisible()
    await shoot(page, size, '44-pending-booking')
  })
})
