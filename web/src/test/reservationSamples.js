/*
 * File:    reservationSamples.js
 * Module:  Unit tests
 * Owner:   Hamnad
 * Purpose: Full booking answers shaped like GET /api/reservations/{id}, with
 *          the rule flags (canModify, isPast, hasQrCode) the pages rely on.
 */
import { booking } from './samples'

// A complete booking. Defaults: booked and approved in the past, slot far in the
// future, changes still open.
export function reservation(overrides = {}) {
  return booking({
    id: 'res-9',
    referenceNo: 'RSV-7KQ4M2',
    stationId: 'st-1',
    slotId: 'slot-1',
    startTime: '2099-01-05T04:30:00Z',
    endTime: '2099-01-05T06:30:00Z',
    status: 'Approved',
    energyKwh: 10,
    deliveredKwh: null,
    reason: null,
    createdBy: '200034501234',
    createdAt: '2026-09-01T04:00:00Z',
    updatedAt: '2026-09-02T04:00:00Z',
    approvedBy: '199023456789',
    approvedAt: '2026-09-02T04:00:00Z',
    canModify: true,
    modifyDeadline: '2099-01-04T16:30:00Z',
    hasQrCode: true,
    isPast: false,
    ...overrides,
  })
}

// A booking still waiting for approval.
export function pendingReservation(overrides = {}) {
  return reservation({ status: 'Pending', approvedBy: null, approvedAt: null, hasQrCode: false, ...overrides })
}
