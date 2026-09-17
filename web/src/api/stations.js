/*
 * File:    stations.js
 * Module:  Microgrid Stations
 * Owner:   Nimthara
 * Purpose: Calls for solar battery stations: list, details, create, update,
 *          weekly schedule, battery bays, activate, deactivate and delete.
 */
import client from './client'

const path = (id) => `/stations/${encodeURIComponent(id)}`

// All stations. Filters: status ("Active" / "Inactive") and search text.
export async function listStations(params) {
  const { data } = await client.get('/stations', { params })
  return data
}

// One station by id.
export async function getStation(id) {
  const { data } = await client.get(path(id))
  return data
}

// Creates a station: { code, name, address, latitude, longitude, solarCapacityKw,
// storageCapacityKwh, totalBatterySlots, schedule? } (Backoffice only).
export async function createStation(station) {
  const { data } = await client.post('/stations', station)
  return data
}

// Updates the details and GPS location (the schedule is saved separately).
export async function updateStation(id, station) {
  const { data } = await client.put(path(id), station)
  return data
}

// Replaces the weekly opening hours: [{ day, openTime, closeTime }].
export async function updateSchedule(id, schedule) {
  const { data } = await client.put(`${path(id)}/schedule`, { schedule })
  return data
}

// Sets how many battery bays can be used right now (all staff).
export async function setBatterySlots(id, availableBatterySlots) {
  const { data } = await client.patch(`${path(id)}/battery-slots`, { availableBatterySlots })
  return data
}

// Takes a station out of service (blocked while it has active bookings).
export async function deactivateStation(id) {
  const { data } = await client.post(`${path(id)}/deactivate`)
  return data
}

// Brings a station back into service.
export async function activateStation(id) {
  const { data } = await client.post(`${path(id)}/activate`)
  return data
}

// Deletes a station that was never booked.
export async function deleteStation(id) {
  await client.delete(path(id))
}
