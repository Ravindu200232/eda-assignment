/*
 * File:    screens-core.spec.js
 * Module:  Core pages - report screenshots
 * Owner:   Ravindu
 * Purpose: Screenshots of the login, staff users, account, check-in and
 *          error pages for the report (run with npm run e2e:screens).
 */
import { expect, test } from '@playwright/test'
import { api, apiLogin, findReservation, loginAs, openFromMenu } from './helpers'
import { screenTests, shoot } from './screens'

screenTests('core pages', (size) => {
  test('login page', async ({ page }) => {
    await page.goto('/#/login')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await shoot(page, size, '01-login')

    await page.getByRole('button', { name: 'Log in' }).click()
    await expect(page.getByText('Enter your password.')).toBeVisible()
    await shoot(page, size, '01-login-errors')
  })

  test('side menu', async ({ page }) => {
    test.skip(size !== 'mobile', 'The menu is always visible on desktop screens.')
    await loginAs(page, 'admin')
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('navigation', { name: 'Main menu' })).toBeVisible()
    await shoot(page, size, '05-menu')
  })

  test('staff users', async ({ page }) => {
    await loginAs(page, 'admin')
    await openFromMenu(page, 'Staff users')
    await expect(page.getByText('Nimal Bandara').first()).toBeVisible()
    await shoot(page, size, '10-users')

    await page.getByRole('button', { name: 'New staff user' }).click()
    await expect(page.getByRole('dialog', { name: 'New staff user' })).toBeVisible()
    await shoot(page, size, '11-user-form')
  })

  test('my account', async ({ page }) => {
    await loginAs(page, 'operator')
    await page.goto('/#/account')
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible()
    await shoot(page, size, '12-account')
  })

  test('qr check-in', async ({ page, request }) => {
    const token = await apiLogin(request, 'admin')
    const booking = await findReservation(request, token, 'RSV-DEMO-0006')
    const qr = await api(request, token, 'GET', `/reservations/${booking.id}/qr`)

    await loginAs(page, 'operator')
    await openFromMenu(page, 'QR check-in')
    await expect(page.getByRole('heading', { name: 'QR check-in' })).toBeVisible()
    await shoot(page, size, '13-check-in')

    await page.getByLabel('QR code text').fill(qr.payload)
    await page.getByRole('button', { name: 'Check code' }).click()
    await expect(page.getByText('Ready to transfer')).toBeVisible()
    await shoot(page, size, '14-check-in-ready')
  })

  test('error pages', async ({ page }) => {
    await loginAs(page, 'operator')
    await page.goto('/#/users')
    await expect(page.getByRole('heading', { name: 'This page is for Backoffice staff' })).toBeVisible()
    await shoot(page, size, '90-not-allowed')

    await page.goto('/#/no-such-page')
    await expect(page.getByRole('heading', { name: 'This page is off the grid' })).toBeVisible()
    await shoot(page, size, '91-not-found')
  })
})
