/*
 * File:    users.js
 * Module:  Staff Users
 * Owner:   Ravindu
 * Purpose: Calls for Backoffice and Grid Operator accounts (Backoffice only).
 */
import client from './client'

// Paged list. Filters: role, status, search, page, pageSize.
export async function listUsers(params) {
  const { data } = await client.get('/users', { params })
  return data
}

// One staff account by NIC.
export async function getUser(nic) {
  const { data } = await client.get(`/users/${encodeURIComponent(nic)}`)
  return data
}

// Creates a staff account: { nic, fullName, email, phone, password, role }.
export async function createUser(user) {
  const { data } = await client.post('/users', user)
  return data
}

// Updates name, email, phone and role. `newPassword` is optional.
export async function updateUser(nic, changes) {
  const { data } = await client.put(`/users/${encodeURIComponent(nic)}`, changes)
  return data
}

// Activates or deactivates a staff account.
export async function setUserStatus(nic, isActive) {
  const { data } = await client.patch(`/users/${encodeURIComponent(nic)}/status`, { isActive })
  return data
}
