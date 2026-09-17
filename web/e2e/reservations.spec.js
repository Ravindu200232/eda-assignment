/*
 * File:    reservations.spec.js
 * Module:  Energy Reservations - end-to-end tests
 * Owner:   Hamnad
 * Purpose: Staff book a slot for a prosumer with the wizard, approve it (QR
 *          code), change and cancel bookings, see the 12-hour lock and the
 *          rejection reason, and use the booking lists, filters and search.
 */
import { expect, test } from '@playwright/test'
import { accounts, activeProsumer, api, apiLogin, findFreeSlot, loginAs, openFromMenu, stationByCode } from './helpers'

const HOUR = 60 * 60 * 1000

// The booking id at the end of the current address (/#/reservations/<id>).
function bookingIdFrom(page) {
  return new URL(page.url()).hash.split('/').pop()
}

test('staff book a slot for a prosumer, approve it and cancel it', async ({ page, request }) => {
  const token = await apiLogin(request, 'admin')
  const prosumer = await activeProsumer(request, token)

  await loginAs(page, 'operator')
  await openFromMenu(page, 'Reservations')
  await page.getByRole('link', { name: 'New booking' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'New booking' })).toBeVisible()

  await page.getByLabel('Find the prosumer').fill(prosumer.nic)
  await page.getByRole('list', { name: 'Matching prosumers' }).getByRole('button', { name: prosumer.fullName }).click()
  await page.getByRole('radiogroup', { name: 'Station' }).getByRole('radio', { name: 'Kandy Lakeside Energy Node' }).check()
  const days = page.getByRole('radiogroup', { name: 'Day' }).getByRole('radio')
  await expect(days).toHaveCount(7)
  await days.nth(1).check()
  await page.getByRole('radiogroup', { name: 'Free slots' }).getByRole('radio').first().check()
  await expect(page.getByText('One booking can use up to 60 kWh at this station.')).toBeVisible()
  await page.getByLabel('Energy (kWh)').fill('12')
  await page.getByRole('radio', { name: 'Export' }).check()
  await page.getByRole('button', { name: 'Book this slot' }).click()

  await expect(page.getByText(/^Booking RSV-[A-Z0-9-]+ was made and waits for approval\.$/)).toBeVisible()
  const reference = (await page.getByRole('heading', { level: 1 }).textContent()).trim()
  const id = bookingIdFrom(page)
  await expect(page.getByText('Pending', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Booking timeline' })).toContainText(`By staff member ${accounts.operator.nic}`)
  await expect(page.getByText('The QR code is created when the booking is approved.')).toBeVisible()

  // Approving issues the QR code.
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await page.getByRole('dialog', { name: 'Approve this booking?' }).getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText(`${reference} is approved. The QR code is ready.`)).toBeVisible()
  await expect(page.getByRole('img', { name: `QR code for ${reference}` })).toBeVisible()
  const qr = await api(request, token, 'GET', `/reservations/${id}/qr`)
  expect(qr.payload).toBeTruthy()

  // Cancelling for the prosumer frees the bay and removes the code.
  await page.getByRole('button', { name: 'Cancel booking' }).click()
  const cancel = page.getByRole('dialog', { name: 'Cancel this booking?' })
  await cancel.getByLabel('Reason (optional)').fill('Prosumer asked at the desk')
  await cancel.getByRole('button', { name: 'Cancel booking' }).click()
  await expect(page.getByText(`${reference} was cancelled.`)).toBeVisible()
  await expect(page.getByRole('img', { name: `QR code for ${reference}` })).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Booking timeline' })).toContainText('Prosumer asked at the desk')
  await expect(page.getByText('This booking is finished, so it can no longer be changed or cancelled.')).toBeVisible()

  const saved = await api(request, token, 'GET', `/reservations/${id}`)
  expect(saved).toMatchObject({ status: 'Cancelled', prosumerNic: prosumer.nic, energyKwh: 12, tradeType: 'Export', hasQrCode: false })
})

test('bookings in the last 12 hours are locked, and a rejection needs a reason', async ({ page, request }) => {
  const token = await apiLogin(request, 'admin')
  const prosumer = await activeProsumer(request, token)
  const malabe = await stationByCode(request, token, 'SSG-MAL-01')
  const soon = await findFreeSlot(request, token, malabe.id, (slot) => Date.parse(slot.startTime) < Date.now() + 11 * HOUR)
  const booking = await api(request, token, 'POST', '/reservations', {
    prosumerNic: prosumer.nic,
    slotId: soon.id,
    energyKwh: 5,
    tradeType: 'Import',
  })
  expect(booking.canModify).toBe(false)

  await loginAs(page, 'admin')
  await page.goto(`/#/reservations/${booking.id}`)
  await expect(page.getByRole('heading', { level: 1, name: booking.referenceNo })).toBeVisible()
  await expect(page.getByText(/^Changes closed at /)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Change', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cancel booking' })).toHaveCount(0)

  // The change page refuses as well.
  await page.goto(`/#/reservations/${booking.id}/edit`)
  await expect(page.getByRole('heading', { name: 'This booking can no longer be changed' })).toBeVisible()
  await page.getByRole('link', { name: 'Open the booking' }).click()

  // A rejection needs a reason the prosumer can read.
  await page.getByRole('button', { name: 'Reject', exact: true }).click()
  const reject = page.getByRole('dialog', { name: 'Reject this booking?' })
  await expect(reject.getByRole('button', { name: 'Reject booking' })).toBeDisabled()
  await reject.getByLabel('Reason for the prosumer').fill('Battery bank reserved for grid balancing')
  await reject.getByRole('button', { name: 'Reject booking' }).click()
  await expect(page.getByText(`${booking.referenceNo} was rejected.`)).toBeVisible()
  await expect(page.getByText('Rejected', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('list', { name: 'Booking timeline' })).toContainText('Battery bank reserved for grid balancing')
  await expect(page.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0)
})

test('staff change an approved booking and it needs approval again', async ({ page, request }) => {
  const token = await apiLogin(request, 'admin')
  const prosumer = await activeProsumer(request, token)
  const colombo = await stationByCode(request, token, 'SSG-COL-01')
  const later = await findFreeSlot(request, token, colombo.id, (slot) => Date.parse(slot.startTime) > Date.now() + 36 * HOUR)
  const booking = await api(request, token, 'POST', '/reservations', {
    prosumerNic: prosumer.nic,
    slotId: later.id,
    energyKwh: 20,
    tradeType: 'Export',
  })
  await api(request, token, 'POST', `/reservations/${booking.id}/approve`)

  await loginAs(page, 'operator')
  await page.goto(`/#/reservations/${booking.id}`)
  await expect(page.getByRole('img', { name: `QR code for ${booking.referenceNo}` })).toBeVisible()
  await page.getByRole('link', { name: 'Change', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Change booking' })).toBeVisible()
  await expect(page.getByText('A booking always stays with the same prosumer.')).toBeVisible()
  await expect(page.getByRole('radiogroup', { name: 'Station' }).getByRole('radio', { name: 'Colombo Fort Solar Hub' })).toBeChecked()

  // The booking's own slot is chosen; move it to another free slot that day.
  const slots = page.getByRole('radiogroup', { name: 'Free slots' })
  await expect(slots.getByRole('radio', { checked: true })).toHaveCount(1)
  await slots.getByRole('radio', { checked: false }).first().check()
  await page.getByLabel('Energy (kWh)').fill('15')
  await page.getByRole('radio', { name: 'Import' }).check()
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByText(`${booking.referenceNo} was changed and waits for approval again.`)).toBeVisible()
  await expect(page.getByText('Pending', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: `QR code for ${booking.referenceNo}` })).toHaveCount(0)

  const saved = await api(request, token, 'GET', `/reservations/${booking.id}`)
  expect(saved).toMatchObject({ status: 'Pending', energyKwh: 15, tradeType: 'Import', hasQrCode: false })
  expect(saved.slotId).not.toBe(later.id)
})

test('the booking lists have tabs, filters and search', async ({ page }) => {
  await loginAs(page, 'admin')

  // The dashboard number opens the list of bookings waiting for approval.
  await page.getByRole('link', { name: /Waiting for approval/ }).click()
  await expect(page).toHaveURL(/#\/reservations\?tab=pending$/)
  await expect(page.getByRole('tab', { name: 'Pending approval' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('table', { name: 'Pending approval bookings' }).getByRole('link', { name: 'RSV-DEMO-0003', exact: true })).toBeVisible()

  await page.getByRole('tab', { name: 'History' }).click()
  const history = page.getByRole('table', { name: 'History bookings' })
  await expect(history.getByRole('link', { name: 'RSV-DEMO-0001', exact: true })).toBeVisible()
  await page.getByLabel('Search bookings').fill('RSV-DEMO-0005')
  await expect(history.getByRole('row')).toHaveCount(2)
  await expect(history.getByRole('row').filter({ hasText: 'RSV-DEMO-0005' })).toContainText('Rejected')
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByLabel('Search bookings')).toHaveValue('')

  await page.getByRole('tab', { name: 'All' }).click()
  await page.getByLabel('Station', { exact: true }).selectOption({ label: 'Galle Fort Microgrid' })
  await page.getByLabel('Status', { exact: true }).selectOption('Rejected')
  const all = page.getByRole('table', { name: 'All bookings' })
  await expect(all.getByRole('link', { name: 'RSV-DEMO-0005', exact: true })).toBeVisible()
  await expect(all.getByRole('row')).toHaveCount(2)

  // Kasun has no rejected bookings at Galle.
  await page.getByLabel('Prosumer NIC').fill(accounts.prosumer.nic)
  await expect(page.getByText('No bookings match')).toBeVisible()
})
