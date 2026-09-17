/*
 * File:    slots.js
 * Module:  Energy Slots
 * Owner:   Nimthara
 * Purpose: Calls for the bookable time slots of a station. Dates are Sri Lanka
 *          dates ("YYYY-MM-DD") and times are "HH:mm"; answers use UTC times.
 */
import client from './client'

// Slots of a station between two dates (default: today and the next 6 days).
export async function listSlots(stationId, params) {
  const { data } = await client.get(`/stations/${encodeURIComponent(stationId)}/slots`, { params })
  return data
}

// Adds one slot: { date, startTime, endTime, capacity? }.
export async function createSlot(stationId, slot) {
  const { data } = await client.post(`/stations/${encodeURIComponent(stationId)}/slots`, slot)
  return data
}

// Fills the opening hours with slots: { fromDate?, days, slotMinutes, capacity? }.
// Returns { created, skipped, slots }.
export async function generateSlots(stationId, request) {
  const { data } = await client.post(`/stations/${encodeURIComponent(stationId)}/slots/generate`, request)
  return data
}

// Changes a slot's capacity or closes/opens it: { capacity, isOpen }.
export async function updateSlot(id, changes) {
  const { data } = await client.put(`/slots/${encodeURIComponent(id)}`, changes)
  return data
}

// Deletes a slot without bookings.
export async function deleteSlot(id) {
  await client.delete(`/slots/${encodeURIComponent(id)}`)
}
