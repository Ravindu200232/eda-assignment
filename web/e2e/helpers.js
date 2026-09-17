/*
 * File:    helpers.js
 * Module:  End-to-end tests
 * Owner:   Ravindu
 * Purpose: Shared steps for the browser tests: demo accounts, logging in
 *          through the page, and direct API calls to prepare test data.
 * Source:  WEB-13 (Playwright request fixture and locators).
 */
import { expect } from '@playwright/test'

export const API_URL = process.env.E2E_API_URL
export const WEB_URL = process.env.E2E_WEB_URL

// Accounts created by the API's demo data (see api/src/SolarGrid.Api/Data/DataSeeder.cs).
export const accounts = {
  admin: { username: 'admin@solargrid.lk', password: 'Admin@123', name: 'System Administrator', nic: '198512345678' },
  operator: { username: 'operator@solargrid.lk', password: 'Operator@123', name: 'Nimal Bandara', nic: '199023456789' },
  prosumer: { username: 'kasun@example.com', password: 'Prosumer@123', name: 'Kasun Perera', nic: '200034501234' },
}

let counter = 0

// A valid 12-digit NIC (year, day of year, serial) that is new in this run.
export function uniqueNic() {
  counter += 1
  const dayOfYear = String(100 + (counter % 200)).padStart(3, '0')
  const serial = `${String(Date.now()).slice(-4)}${counter % 10}`
  return `1995${dayOfYear}${serial}`
}

// Fills the login form with any credentials and presses the button.
export async function submitLogin(page, username, password) {
  await page.goto('/#/login')
  await page.getByLabel('NIC or email').fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
}

// Logs in as a demo account and waits for the portal to open.
export async function loginAs(page, who) {
  const account = typeof who === 'string' ? accounts[who] : who
  await submitLogin(page, account.username, account.password)
  await expect(page.getByRole('button', { name: `Account menu for ${account.name ?? account.fullName}` })).toBeVisible()
}

// Opens a page from the side menu (on phones the menu is a drawer).
export async function openFromMenu(page, label) {
  const openMenu = page.getByRole('button', { name: 'Open menu' })
  if (await openMenu.isVisible()) await openMenu.click()
  await page.getByRole('navigation', { name: 'Main menu' }).getByRole('link', { name: label }).click()
}

// Logs in through the API and returns a bearer token.
export async function apiLogin(request, who) {
  const account = typeof who === 'string' ? accounts[who] : who
  const response = await request.post(`${API_URL}/api/auth/login`, {
    data: { username: account.username, password: account.password },
  })
  expect(response.ok(), await response.text()).toBeTruthy()
  return (await response.json()).token
}

// Calls the API with a token and returns the JSON body (fails the test on errors).
export async function api(request, token, method, path, data) {
  const response = await request.fetch(`${API_URL}/api${path}`, {
    method,
    data,
    headers: { Authorization: `Bearer ${token}` },
  })
  const text = await response.text()
  expect(response.ok(), `${method} ${path} -> ${response.status()} ${text}`).toBeTruthy()
  return text ? JSON.parse(text) : null
}

// Finds a demo booking by its reference number.
export async function findReservation(request, token, referenceNo) {
  const page = await api(request, token, 'GET', `/reservations?search=${encodeURIComponent(referenceNo)}`)
  const reservation = page.items.find((item) => item.referenceNo === referenceNo)
  expect(reservation, `reservation ${referenceNo}`).toBeTruthy()
  return reservation
}

// Creates an active staff account through the API.
export async function createStaffUser(request, token, overrides = {}) {
  const nic = uniqueNic()
  const user = {
    nic,
    fullName: `Test Operator ${nic.slice(-4)}`,
    email: `operator.${nic}@test.solargrid.lk`,
    phone: '0771112233',
    password: 'Operator@123',
    role: 'GridOperator',
    ...overrides,
  }
  await api(request, token, 'POST', '/users', user)
  return { ...user, username: user.email }
}

// Added by Malith: signs a new prosumer up the way the mobile app does (status Pending).
export async function registerProsumer(request, overrides = {}) {
  const nic = uniqueNic()
  const prosumer = {
    nic,
    fullName: `Test Prosumer ${nic.slice(-4)}`,
    email: `prosumer.${nic}@test.solargrid.lk`,
    phone: '0712223344',
    password: 'Prosumer@123',
    address: 'No. 1, Test Road, Colombo',
    meterNumber: `CEB-TST-${nic.slice(-5)}`,
    solarCapacityKw: 4.2,
    ...overrides,
  }
  const response = await request.post(`${API_URL}/api/prosumers/register`, { data: prosumer })
  expect(response.status(), await response.text()).toBe(201)
  return { ...prosumer, username: prosumer.email }
}

// Added by Malith: tries a login and returns the HTTP status (200, 401 or 403).
export async function loginStatus(request, username, password) {
  const response = await request.post(`${API_URL}/api/auth/login`, { data: { username, password } })
  return response.status()
}
