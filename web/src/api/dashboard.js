/*
 * File:    dashboard.js
 * Module:  Dashboards
 * Owner:   Malith
 * Purpose: Live numbers for the home page and the staff dashboards, and the
 *          list of bookings for one day.
 */
import client from './client'

// Public numbers for the home page (no login needed).
export async function getPublicSummary() {
  const { data } = await client.get('/dashboard/public')
  return data
}

// Counts and the next bookings for Backoffice and Grid Operator dashboards.
export async function getStaffSummary() {
  const { data } = await client.get('/dashboard/summary')
  return data
}

// Bookings that start on one Sri Lanka date ("YYYY-MM-DD"). The API returns the latest start first.
export async function getBookingsForDay(dateKey) {
  const { data } = await client.get('/reservations', { params: { from: dateKey, to: dateKey, pageSize: 100 } })
  return data
}
