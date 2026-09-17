/*
 * File:    auth.js
 * Module:  Authentication
 * Owner:   Ravindu
 * Purpose: Login, current user and password change calls.
 */
import client from './client'

// Logs in with a NIC or email. Returns { token, expiresAt, user }.
export async function login(username, password) {
  const { data } = await client.post('/auth/login', { username, password })
  return data
}

// Details of the signed-in user.
export async function getCurrentUser() {
  const { data } = await client.get('/auth/me')
  return data
}

// Changes the signed-in user's password.
export async function changePassword(currentPassword, newPassword) {
  await client.post('/auth/change-password', { currentPassword, newPassword })
}
