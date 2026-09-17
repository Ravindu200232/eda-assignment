/*
 * File:    screens-stations.spec.js
 * Module:  Microgrid Stations and Energy Slots - report screenshots
 * Owner:   Nimthara
 * Purpose: Screenshots of the station list, map, form and details pages
 *          (run with npm run e2e:screens). This run shows Google Maps when
 *          web/.env.local has a key, otherwise OpenStreetMap.
 */
import { expect, test } from '@playwright/test'
import { loginAs, openFromMenu } from './helpers'
import { screenTests, shoot } from './screens'

// Waits until a map has drawn (Google Maps or OpenStreetMap).
async function waitForMap(page, name) {
  const map = page.getByRole('region', { name })
  await expect(map.locator('.gm-style, .leaflet-tile-loaded').first()).toBeVisible({ timeout: 20_000 })
  return map
}

screenTests('stations and slots', (size) => {
  test('station list and map', async ({ page }) => {
    await loginAs(page, 'admin')
    await openFromMenu(page, 'Stations')
    await expect(page.getByRole('link', { name: 'SLIIT Malabe Campus Microgrid' }).first()).toBeVisible()
    await shoot(page, size, '30-stations')

    await page.getByRole('tab', { name: 'Map' }).click()
    const map = await waitForMap(page, 'Map of stations')
    await map.getByRole('button', { name: 'Kandy Lakeside Energy Node' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Kandy Lakeside Energy Node' })).toBeVisible()
    await shoot(page, size, '31-stations-map')
  })

  test('new station form', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/#/stations/new')
    await page.getByLabel('Station code').fill('SSG-HOM-01')
    await page.getByLabel('Station name').fill('Homagama Solar Yard')
    await page.getByLabel('Address').fill('High Level Road, Homagama')
    await page.getByLabel('Solar capacity (kW)').fill('90')
    await page.getByLabel('Storage (kWh)').fill('360')
    await page.getByLabel('Battery bays').fill('6')
    const map = await waitForMap(page, 'Map for choosing the station location')
    await map.click()
    await expect(page.getByLabel('Latitude')).toHaveValue(/^\d+\.\d{6}$/)
    await page.getByRole('switch', { name: 'Open on Sunday' }).click()
    await shoot(page, size, '32-station-form')
  })

  test('station details and slot dialogs', async ({ page }) => {
    await loginAs(page, 'admin')
    await openFromMenu(page, 'Stations')
    await page.getByRole('link', { name: 'SLIIT Malabe Campus Microgrid' }).first().click()
    await waitForMap(page, 'Map showing SLIIT Malabe Campus Microgrid')
    await expect(page.getByRole('region', { name: 'Slots for the next 7 days' }).getByRole('listitem').first()).toBeVisible()
    await shoot(page, size, '33-station-details')

    await page.getByRole('button', { name: 'Generate slots' }).click()
    await expect(page.getByRole('dialog', { name: 'Generate slots' })).toBeVisible()
    await shoot(page, size, '34-generate-slots')
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()

    await page.getByRole('button', { name: 'Edit hours' }).click()
    await expect(page.getByRole('dialog', { name: 'Opening hours' })).toBeVisible()
    await shoot(page, size, '35-opening-hours')
  })
})
