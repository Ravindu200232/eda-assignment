/*
 * File:    roles.js
 * Module:  Core (authentication)
 * Owner:   Ravindu
 * Purpose: Role names used by the API, and the groups the web app checks.
 */

export const Roles = Object.freeze({
  Backoffice: 'Backoffice',
  GridOperator: 'GridOperator',
  Prosumer: 'Prosumer',
})

// Only staff can use the web portal. Prosumers use the mobile app.
export const STAFF_ROLES = Object.freeze([Roles.Backoffice, Roles.GridOperator])

export const BACKOFFICE_ONLY = Object.freeze([Roles.Backoffice])

export const STAFF_ROLE_OPTIONS = Object.freeze([
  { value: Roles.Backoffice, label: 'Backoffice' },
  { value: Roles.GridOperator, label: 'Grid Operator' },
])

// True when the user has one of the given roles.
export function hasRole(user, roles) {
  return Boolean(user && roles.includes(user.role))
}
