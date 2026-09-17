/*
 * File:    auth.spec.js
 * Module:  Authentication - end-to-end tests
 * Owner:   Ravindu
 * Purpose: Login for each staff role, role-based menus and pages, the
 *          prosumer refusal, logout, password change and sessions that end
 *          when an account is deactivated.
 */
import { expect, test } from '@playwright/test'
import { accounts, api, apiLogin, createStaffUser, loginAs, submitLogin } from './helpers'

test.describe('login and roles', () => {
  test('a Backoffice user logs in and sees the admin tools', async ({ page }) => {
    await loginAs(page, 'admin')

    const menu = page.getByRole('navigation', { name: 'Main menu' })
    await expect(menu.getByRole('link', { name: 'Staff users' })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'QR check-in' })).toBeVisible()
    await expect(page.getByText(/Good (morning|afternoon|evening), System/)).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'API online' })).toBeVisible()
  })

  test('a Grid Operator only gets the operational tools', async ({ page }) => {
    await loginAs(page, 'operator')

    const menu = page.getByRole('navigation', { name: 'Main menu' })
    await expect(menu.getByRole('link', { name: 'QR check-in' })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'Staff users' })).toHaveCount(0)

    await page.goto('/#/users')
    await expect(page.getByRole('heading', { name: 'This page is for Backoffice staff' })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Staff users' })).toHaveCount(0)
  })

  test('the login form also works with the NIC and the Enter key', async ({ page }) => {
    await page.goto('/#/login')
    await page.getByLabel('NIC or email').fill(accounts.operator.nic)
    await page.getByLabel('Password', { exact: true }).fill(accounts.operator.password)
    await page.getByLabel('Password', { exact: true }).press('Enter')

    await expect(page.getByRole('navigation', { name: 'Main menu' })).toBeVisible()
  })

  test('prosumer accounts are sent to the mobile app', async ({ page }) => {
    await submitLogin(page, accounts.prosumer.username, accounts.prosumer.password)

    await expect(page.getByRole('alert')).toContainText('This portal is for Backoffice and Grid Operator staff.')
    await expect(page).toHaveURL(/#\/login$/)
    expect(await page.evaluate(() => localStorage.getItem('solargrid.session'))).toBeNull()
  })

  test('a wrong password shows the API message', async ({ page }) => {
    await submitLogin(page, accounts.admin.username, 'not-the-password1')

    await expect(page.getByRole('alert')).toHaveText('Incorrect NIC/email or password.')
  })

  test('empty fields show the API validation messages', async ({ page }) => {
    await page.goto('/#/login')
    await page.getByRole('button', { name: 'Log in' }).click()

    await expect(page.getByText('Enter your NIC or email.')).toBeVisible()
    await expect(page.getByText('Enter your password.')).toBeVisible()
    await expect(page.getByLabel('NIC or email')).toHaveAttribute('aria-invalid', 'true')
  })
})

test.describe('sessions', () => {
  test('signed-out visitors log in and return to the page they asked for', async ({ page }) => {
    await page.goto('/#/account')
    await expect(page).toHaveURL(/#\/login$/)

    await page.getByLabel('NIC or email').fill(accounts.admin.username)
    await page.getByLabel('Password', { exact: true }).fill(accounts.admin.password)
    await page.getByRole('button', { name: 'Log in' }).click()

    await expect(page).toHaveURL(/#\/account$/)
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible()
  })

  test('logging out ends the session', async ({ page }) => {
    await loginAs(page, 'admin')

    await page.getByRole('button', { name: 'Account menu for System Administrator' }).click()
    await page.getByRole('button', { name: 'Log out' }).last().click()

    await expect(page.getByText('You have logged out. See you soon!')).toBeVisible()
    await page.goto('/#/users')
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible()
  })

  test('a deactivated account is signed out on its next request', async ({ page, request }) => {
    const adminToken = await apiLogin(request, 'admin')
    const staff = await createStaffUser(request, adminToken)
    await loginAs(page, staff)

    await api(request, adminToken, 'PATCH', `/users/${staff.nic}/status`, { isActive: false })
    await page.reload()

    await expect(page.getByText('This account is no longer active. Please contact the back office.')).toBeVisible()
    await expect(page).toHaveURL(/#\/login/)
  })

  test('a staff member changes their password and uses it next time', async ({ page, request }) => {
    const adminToken = await apiLogin(request, 'admin')
    const staff = await createStaffUser(request, adminToken)
    await loginAs(page, staff)

    await page.goto('/#/account')
    await page.getByLabel('Current password').fill(staff.password)
    await page.getByLabel('New password', { exact: true }).fill('Changed@2026')
    await page.getByLabel('Repeat new password').fill('Changed@2026')
    await page.getByRole('button', { name: 'Change password' }).click()
    await expect(page.getByText('Your password was changed.')).toBeVisible()

    await page.getByRole('button', { name: 'Log out now' }).click()
    await submitLogin(page, staff.username, staff.password)
    await expect(page.getByRole('alert')).toHaveText('Incorrect NIC/email or password.')

    await loginAs(page, { ...staff, password: 'Changed@2026' })
  })

  test('the current password must be right', async ({ page }) => {
    await loginAs(page, 'operator')
    await page.goto('/#/account')

    await page.getByLabel('Current password').fill('Wrong@1234')
    await page.getByLabel('New password', { exact: true }).fill('Another@2026')
    await page.getByLabel('Repeat new password').fill('Another@2026')
    await page.getByRole('button', { name: 'Change password' }).click()

    await expect(page.getByRole('alert')).toHaveText('Current password is incorrect.')
  })
})

test('unknown addresses show the not-found page', async ({ page }) => {
  await page.goto('/#/no-such-page')

  await expect(page.getByRole('heading', { name: 'This page is off the grid' })).toBeVisible()
  await page.getByRole('link', { name: 'Go to the start page' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Trade sunshine')
})
