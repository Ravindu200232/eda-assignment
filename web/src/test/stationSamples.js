/*
 * File:    stationSamples.js
 * Module:  Unit tests
 * Owner:   Nimthara
 * Purpose: Sample stations and slots shaped like the API's answers.
 */

const EVERY_DAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// A station with sensible defaults (open 06:00-18:00 every day).
export function station(overrides = {}) {
  return {
    id: 'st-1',
    code: 'SSG-KAN-01',
    name: 'Kandy Lakeside Energy Node',
    address: 'Lake Road, Kandy',
    latitude: 7.2926,
    longitude: 80.6413,
    solarCapacityKw: 120,
    storageCapacityKwh: 480,
    totalBatterySlots: 8,
    availableBatterySlots: 6,
    bayCapacityKwh: 60,
    schedule: EVERY_DAY.map((day) => ({ day, openTime: '06:00', closeTime: '18:00' })),
    status: 'Active',
    createdAt: '2026-09-01T04:00:00Z',
    updatedAt: '2026-09-01T04:00:00Z',
    ...overrides,
  }
}

// A slot in the future with free bays.
export function slot(overrides = {}) {
  return {
    id: 'sl-1',
    stationId: 'st-1',
    startTime: '2099-01-05T02:30:00Z',
    endTime: '2099-01-05T04:30:00Z',
    capacity: 4,
    bookedCount: 0,
    availableBays: 4,
    isOpen: true,
    ...overrides,
  }
}
