/*
 * File:    reservations.js
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: Staff calls for energy bookings: search, details, booking for a
 *          prosumer, changing, cancelling, approving, rejecting and the
 *          booking's QR code. Every rule is checked by the API.
 */
import client from './client'

const path = (id) => `/reservations/${encodeURIComponent(id)}`

// Paged list. Filters: scope (Pending, Current, History), status, stationId,
// nic, from, to ("YYYY-MM-DD"), search, page, pageSize.
export async function listReservations(params) {
  const { data } = await client.get('/reservations', { params })
  return data
}

// One booking.
export async function getReservation(id) {
  const { data } = await client.get(path(id))
  return data
}

// Books a slot for a prosumer: { prosumerNic, slotId, energyKwh, tradeType }.
// New bookings wait for approval.
export async function createReservation(booking) {
  const { data } = await client.post('/reservations', booking)
  return data
}

// Changes the slot, energy or trade type: { slotId, energyKwh, tradeType }.
// Needs 12 hours' notice, and the booking has to be approved again.
export async function updateReservation(id, changes) {
  const { data } = await client.put(path(id), changes)
  return data
}

// Cancels a booking (12 hours' notice). The reason is optional.
export async function cancelReservation(id, reason) {
  const { data } = await client.post(`${path(id)}/cancel`, { reason: reason || null })
  return data
}

// Approves a pending booking; the API issues its QR code.
export async function approveReservation(id) {
  const { data } = await client.post(`${path(id)}/approve`)
  return data
}

// Rejects a pending booking. The prosumer sees the reason.
export async function rejectReservation(id, reason) {
  const { data } = await client.post(`${path(id)}/reject`, { reason })
  return data
}

// The signed QR code text of an approved booking: { referenceNo, stationName, startTime, endTime, payload }.
export async function getReservationQr(id) {
  const { data } = await client.get(`${path(id)}/qr`)
  return data
}
