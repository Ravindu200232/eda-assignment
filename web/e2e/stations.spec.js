/*
 * File:    stations.spec.js
 * Module:  Microgrid Stations and Energy Slots - end-to-end tests
 * Owner:   Nimthara
 * Purpose: Backoffice adds a station on the map, sets its hours, bays and
 *          slots; the API's deactivate/delete rules are shown; Grid Operators
 *          change bays and slots but not the station itself.
 *          These runs use OpenStreetMap (see playwright.config.js).
 */
import { expect, test } from '@playwright/test'
import { API_URL, apiLogin, colomboDate, createStation, loginAs, openFromMenu, uniqueNic } from './helpers'

// Opens the station list and returns the row of one station.
async function findStationRow(page, text) {
  await openFromMenu(page, 'Stations')
  await page.getByLabel('Search stations').fill(text)
  const row = page.getByRole('row').filter({ hasText: text })
  await expect(row).toHaveCount(1)
  return row
}

// Answers a confirmation dialog with its main button.
async function confirm(page, title, button) {
  const dialog = page.getByRole('dialog', { name: title })
  await dialog.getByRole('button', { name: button }).click()
  return dialog
}

test('Backoffice adds a station on the map and prepares its hours, bays and slots', async ({ page }) => {
  const suffix = uniqueNic().slice(-5)
  const name = `Homagama Solar Yard ${suffix}`
  const tomorrow = colomboDate(1)

  await loginAs(page, 'admin')
  await openFromMenu(page, 'Stations')
  await page.getByRole('link', { name: 'New station' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'New station' })).toBeVisible()

  await page.getByLabel('Station code').fill(`SSG-HOM-${suffix}`)
  await page.getByLabel('Station name').fill(name)
  await page.getByLabel('Address').fill('High Level Road, Homagama')
  await page.getByLabel('Solar capacity (kW)').fill('90')
  await page.getByLabel('Storage (kWh)').fill('360')
  await page.getByLabel('Battery bays').fill('6')
  await expect(page.getByText('Each booking can use up to about 60 kWh (storage divided by bays).')).toBeVisible()

  // A click on the map fills both coordinates and drops the pin.
  await page.getByRole('region', { name: 'Map for choosing the station location' }).click()
  await expect(page.getByLabel('Latitude')).toHaveValue(/^\d+\.\d{6}$/)
  await expect(page.getByLabel('Longitude')).toHaveValue(/^\d+\.\d{6}$/)
  await expect(page.getByRole('button', { name: 'Chosen location' })).toBeVisible()
  await page.getByLabel('Latitude').fill('6.842100')
  await page.getByLabel('Longitude').fill('80.003400')

  // Closed on Sundays, shorter hours on Saturdays.
  await page.getByRole('switch', { name: 'Open on Sunday' }).click()
  await expect(page.getByLabel('Sunday opening time')).toBeDisabled()
  await page.getByLabel('Saturday closing time').selectOption('14:00')
  await page.getByRole('button', { name: 'Create station' }).click()

  await expect(page.getByText(`${name} was added.`)).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  await expect(page.getByText('GPS 6.84210, 80.00340')).toBeVisible()
  const week = page.getByRole('list', { name: 'Weekly opening hours' })
  await expect(week.getByRole('listitem').filter({ hasText: 'Sunday' })).toContainText('Closed')
  await expect(week.getByRole('listitem').filter({ hasText: 'Saturday' })).toContainText('06:00 – 14:00')

  // Open all day from now on.
  await page.getByRole('button', { name: 'Edit hours' }).click()
  const hours = page.getByRole('dialog', { name: 'Opening hours' })
  await expect(hours.getByRole('switch', { name: 'Open on Sunday' })).toHaveAttribute('aria-checked', 'false')
  await hours.getByRole('button', { name: 'Open 24 hours' }).click()
  await hours.getByRole('button', { name: 'Save hours' }).click()
  await expect(page.getByText(`Opening hours of ${name} were saved.`)).toBeVisible()
  await expect(week.getByText('Open 24 hours')).toHaveCount(7)

  // Two bays go into maintenance.
  await page.getByRole('button', { name: 'One bay less' }).click()
  await page.getByRole('button', { name: 'One bay less' }).click()
  await expect(page.getByLabel('Bays available', { exact: true })).toHaveText('4')
  await page.getByRole('button', { name: 'Save bays' }).click()
  await expect(page.getByText(`${name}: 4 of 6 bays available.`)).toBeVisible()

  // Tomorrow is filled with 4-hour slots that offer the 4 working bays.
  const slots = page.getByRole('region', { name: 'Slots for the next 7 days' })
  await expect(slots.getByText('No slots in the next 7 days')).toBeVisible()
  await slots.getByRole('button', { name: 'Generate slots' }).click()
  const generate = page.getByRole('dialog', { name: 'Generate slots' })
  await generate.getByLabel('First day').fill(tomorrow)
  await generate.getByLabel('Number of days').selectOption('1')
  await generate.getByLabel('Slot length').selectOption('240')
  await generate.getByRole('button', { name: 'Generate slots' }).click()
  await expect(page.getByText('6 slots created.')).toBeVisible()
  await expect(slots.getByRole('listitem')).toHaveCount(6)
  await expect(slots.getByRole('listitem', { name: 'Slot 20:00 – 00:00' })).toContainText('0 of 4 bays booked · 4 free')

  // Replace 08:00-12:00 with a smaller 08:00-10:00 slot.
  await slots.getByRole('listitem', { name: 'Slot 08:00 – 12:00' }).getByRole('button', { name: 'Delete slot' }).click()
  await confirm(page, 'Delete this slot?', 'Delete slot')
  await expect(page.getByText('Slot deleted.')).toBeVisible()
  await expect(slots.getByRole('listitem')).toHaveCount(5)

  await slots.getByRole('button', { name: 'Add slot' }).click()
  const add = page.getByRole('dialog', { name: 'Add a slot' })
  await add.getByLabel('Date').fill(tomorrow)
  await add.getByLabel('Start time').selectOption('08:00')
  await add.getByLabel('End time').selectOption('10:00')
  await add.getByLabel('Bays in this slot').fill('2')
  await add.getByRole('button', { name: 'Add slot' }).click()
  await expect(page.getByText(/^Slot added for .*, 08:00 – 10:00\.$/)).toBeVisible()
  const morning = slots.getByRole('listitem', { name: 'Slot 08:00 – 10:00' })
  await expect(morning).toContainText('0 of 2 bays booked · 2 free')

  // The API refuses a slot that overlaps another one.
  await slots.getByRole('button', { name: 'Add slot' }).click()
  await add.getByLabel('Date').fill(tomorrow)
  await add.getByLabel('Start time').selectOption('09:00')
  await add.getByLabel('End time').selectOption('11:00')
  await add.getByRole('button', { name: 'Add slot' }).click()
  await expect(add.getByText('This time overlaps another slot at the station.')).toBeVisible()
  await add.getByRole('button', { name: 'Cancel' }).click()
  await expect(add).toBeHidden()

  // Change the new slot: one bay, closed for booking.
  await morning.getByRole('button', { name: 'Change slot' }).click()
  const change = page.getByRole('dialog', { name: 'Change slot' })
  await change.getByLabel('Bays in this slot').fill('1')
  await change.getByRole('switch', { name: 'Open for booking' }).click()
  await change.getByRole('button', { name: 'Save slot' }).click()
  await expect(page.getByText('Slot updated.')).toBeVisible()
  await expect(morning).toContainText('Closed')
  await expect(morning).toContainText('0 of 1 bays booked')
})

test('the API rules for deactivating and deleting stations are shown', async ({ page, request }) => {
  const token = await apiLogin(request, 'admin')
  const unused = await createStation(request, token)

  await loginAs(page, 'admin')

  // Malabe has bookings, so it can be neither deactivated nor deleted.
  const malabe = await findStationRow(page, 'SSG-MAL-01')
  await malabe.getByRole('link', { name: 'SLIIT Malabe Campus Microgrid' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'SLIIT Malabe Campus Microgrid' })).toBeVisible()
  await page.getByRole('button', { name: 'Deactivate', exact: true }).click()
  let dialog = await confirm(page, 'Take this station out of service?', 'Deactivate')
  await expect(dialog.getByText('This station has active reservations. Cancel or complete them before deactivating the station.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Go back' }).click()

  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  dialog = await confirm(page, 'Delete this station?', 'Delete station')
  await expect(dialog.getByText('This station has booking history and cannot be deleted. Deactivate it instead.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Go back' }).click()
  await expect(page.getByText('In service', { exact: true })).toBeVisible()

  // A station without bookings can be taken out of service, brought back and deleted.
  await page.goto(`/#/stations/${unused.id}`)
  await expect(page.getByRole('heading', { level: 1, name: unused.name })).toBeVisible()
  await page.getByRole('button', { name: 'Deactivate', exact: true }).click()
  await confirm(page, 'Take this station out of service?', 'Deactivate')
  await expect(page.getByText(`${unused.name} is now out of service.`)).toBeVisible()
  await expect(page.getByText('This station is out of service, so no new slots can be added.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate slots' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Activate', exact: true }).click()
  await confirm(page, 'Bring this station back into service?', 'Activate')
  await expect(page.getByText(`${unused.name} is now in service.`)).toBeVisible()

  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await confirm(page, 'Delete this station?', 'Delete station')
  await expect(page.getByText(`${unused.name} was deleted.`)).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Stations' })).toBeVisible()
  await page.getByLabel('Search stations').fill(unused.code)
  await expect(page.getByText('No stations match')).toBeVisible()

  const gone = await request.get(`${API_URL}/api/stations/${unused.id}`, { headers: { Authorization: `Bearer ${token}` } })
  expect(gone.status()).toBe(404)
})

test('Grid Operators change bays and slots but not the station itself', async ({ page, request }) => {
  const token = await apiLogin(request, 'admin')
  const station = await createStation(request, token)

  // The Operations page changes bays with one click.
  await loginAs(page, 'operator')
  const bays = page.getByRole('list', { name: 'Battery bays per station' })
  const card = bays.getByRole('listitem').filter({ hasText: station.name })
  await card.getByRole('button', { name: `One bay less at ${station.name}` }).click()
  await expect(card.getByRole('meter')).toHaveAttribute('aria-valuetext', '3 of 4 bays available')

  // No station editing for operators.
  await openFromMenu(page, 'Stations')
  await expect(page.getByRole('heading', { level: 1, name: 'Stations' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'New station' })).toHaveCount(0)
  const row = await findStationRow(page, station.code)
  await row.getByRole('link', { name: station.name }).click()
  await expect(page.getByRole('heading', { level: 1, name: station.name })).toBeVisible()
  for (const action of ['Edit', 'Deactivate', 'Delete', 'Edit hours']) {
    await expect(page.getByRole('button', { name: action, exact: true }).or(page.getByRole('link', { name: action, exact: true }))).toHaveCount(0)
  }

  // Bays and slots are theirs to manage.
  await expect(page.getByLabel('Bays available', { exact: true })).toHaveText('3')
  await page.getByRole('button', { name: 'All bays' }).click()
  await page.getByRole('button', { name: 'Save bays' }).click()
  await expect(page.getByText(`${station.name}: 4 of 4 bays available.`)).toBeVisible()

  const slots = page.getByRole('region', { name: 'Slots for the next 7 days' })
  await slots.getByRole('button', { name: 'Generate slots' }).click()
  const generate = page.getByRole('dialog', { name: 'Generate slots' })
  await generate.getByLabel('First day').fill(colomboDate(1))
  await generate.getByLabel('Number of days').selectOption('2')
  await generate.getByRole('button', { name: 'Generate slots' }).click()
  await expect(page.getByText('12 slots created.')).toBeVisible()
  await expect(slots.getByRole('tablist', { name: 'Days with slots' }).getByRole('tab')).toHaveCount(2)

  // Backoffice-only pages stay closed.
  await page.goto(`/#/stations/${station.id}/edit`)
  await expect(page.getByRole('heading', { name: 'This page is for Backoffice staff' })).toBeVisible()
})

test('the station list filters, searches and shows stations on the map', async ({ page }) => {
  await loginAs(page, 'admin')
  await openFromMenu(page, 'Stations')
  const table = page.getByRole('table', { name: 'Stations' })
  await expect(table.getByRole('link', { name: 'SLIIT Malabe Campus Microgrid' })).toBeVisible()

  await page.getByRole('tab', { name: 'Out of service' }).click()
  await expect(table.getByRole('link', { name: 'Negombo Beach Solar Station' })).toBeVisible()
  await expect(table.getByRole('link', { name: 'SLIIT Malabe Campus Microgrid' })).toHaveCount(0)

  await page.getByRole('tab', { name: 'All' }).click()
  await page.getByLabel('Search stations').fill('Lake Road')
  await expect(table.getByRole('row')).toHaveCount(2)
  await expect(table.getByRole('link', { name: 'Kandy Lakeside Energy Node' })).toBeVisible()
  await page.getByLabel('Search stations').fill('')

  // Map view: clicking a pin shows that station beside the map.
  await page.getByRole('tab', { name: 'Map' }).click()
  const map = page.getByRole('region', { name: 'Map of stations' })
  await expect(map).toBeVisible()
  await expect(page.getByText('Pick a station')).toBeVisible()
  await expect(map.getByRole('button', { name: 'Negombo Beach Solar Station' })).toBeVisible()
  await map.getByRole('button', { name: 'Kandy Lakeside Energy Node' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Kandy Lakeside Energy Node' })).toBeVisible()
  await expect(page.getByText('SSG-KAN-01', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Open station' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Kandy Lakeside Energy Node' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Map showing Kandy Lakeside Energy Node' })).toBeVisible()
})
