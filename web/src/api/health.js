/*
 * File:    health.js
 * Module:  Core (API access)
 * Owner:   Ravindu
 * Purpose: Checks whether the API and its database are reachable.
 */
import client from './client'

// Returns { status, database } or throws when the API is down.
export async function getHealth() {
  const { data } = await client.get('/health', { timeout: 8000 })
  return data
}
