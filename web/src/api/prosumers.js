/*
 * File:    prosumers.js
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: Staff calls for prosumer accounts: list, details, create, update,
 *          deactivate, activate (Backoffice only) and the activation queue.
 */
import client from './client'

const path = (nic) => `/prosumers/${encodeURIComponent(nic)}`

// Paged list. Filters: status, search, page, pageSize.
export async function listProsumers(params) {
  const { data } = await client.get('/prosumers', { params })
  return data
}

// New mobile sign-ups waiting for a Backoffice decision, oldest first.
export async function listPendingActivations() {
  const { data } = await client.get('/prosumers/pending-activations')
  return data
}

// One prosumer by NIC.
export async function getProsumer(nic) {
  const { data } = await client.get(path(nic))
  return data
}

// Creates an active prosumer: { nic, fullName, email, phone, password, address, meterNumber?, solarCapacityKw? }.
export async function createProsumer(prosumer) {
  const { data } = await client.post('/prosumers', prosumer)
  return data
}

// Updates the details. The NIC cannot change.
export async function updateProsumer(nic, changes) {
  const { data } = await client.put(path(nic), changes)
  return data
}

// Deactivates an account or rejects a pending sign-up.
export async function deactivateProsumer(nic) {
  const { data } = await client.post(`${path(nic)}/deactivate`)
  return data
}

// Activates a sign-up or reactivates an account (Backoffice only).
export async function activateProsumer(nic) {
  const { data } = await client.post(`${path(nic)}/activate`)
  return data
}

// One prosumer's bookings, latest start time first.
export async function listProsumerBookings(nic, params) {
  const { data } = await client.get('/reservations', { params: { ...params, nic } })
  return data
}
