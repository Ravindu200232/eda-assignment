/*
 * File:    samples.js
 * Module:  Unit tests
 * Owner:   Malith
 * Purpose: Sample prosumers and bookings shaped like the API's answers.
 */

export const activeProsumer = {
  nic: '200034501234',
  fullName: 'Kasun Perera',
  email: 'kasun@example.com',
  phone: '0712345678',
  role: 'Prosumer',
  status: 'Active',
  address: 'No. 12, Temple Road, Malabe',
  meterNumber: 'CEB-MLB-10021',
  solarCapacityKw: 5.5,
  createdAt: '2026-09-10T04:00:00Z',
  activatedAt: '2026-09-10T05:00:00Z',
}

export const pendingProsumer = {
  nic: '200112304567',
  fullName: 'Tharindu Jayasinghe',
  email: 'tharindu@example.com',
  phone: '0754567890',
  role: 'Prosumer',
  status: 'Pending',
  address: 'No. 8, Peradeniya Road, Kandy',
  meterNumber: 'CEB-KAN-30987',
  solarCapacityKw: 3,
  createdAt: '2026-09-15T04:00:00Z',
}

export const deactivatedProsumer = {
  nic: '882345678V',
  fullName: 'Dilani Fernando',
  email: 'dilani@example.com',
  phone: '0765678901',
  role: 'Prosumer',
  status: 'Deactivated',
  address: 'No. 3, Church Street, Galle',
  meterNumber: null,
  solarCapacityKw: null,
  createdAt: '2026-09-01T04:00:00Z',
  deactivatedAt: '2026-09-02T04:00:00Z',
}

// A booking summary or full booking with sensible defaults.
export function booking(overrides = {}) {
  return {
    id: 'res-1',
    referenceNo: 'RSV-DEMO-0002',
    prosumerNic: '200034501234',
    prosumerName: 'Kasun Perera',
    stationName: 'SLIIT Malabe Campus Microgrid',
    startTime: '2026-09-17T04:30:00Z',
    endTime: '2026-09-17T06:30:00Z',
    tradeType: 'Export',
    energyKwh: 10,
    status: 'Approved',
    isPast: false,
    ...overrides,
  }
}

// A staff dashboard answer.
export function staffSummary(overrides = {}) {
  return {
    pendingReservations: 3,
    approvedFutureReservations: 7,
    todaysReservations: 4,
    activeStations: 4,
    totalStations: 5,
    pendingActivations: 2,
    activeProsumers: 12,
    upcomingReservations: [booking()],
    generatedAt: '2026-09-17T03:15:00Z',
    ...overrides,
  }
}
