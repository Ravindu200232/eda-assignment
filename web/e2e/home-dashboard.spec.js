/*
 * File:    home-dashboard.spec.js
 * Module:  Dashboards - end-to-end tests
 * Owner:   Malith
 * Purpose: The public home page, where each staff role lands after login,
 *          the live dashboard numbers and the menu counter for sign-ups.
 */
import { expect, test } from '@playwright/test'
import { loginAs, registerProsumer } from './helpers'

test('the home page shows live numbers and leads to the login', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Trade sunshine')
  const numbers = page.getByRole('region', { name: 'Live from the grid' })
  await expect(numbers.getByText('Active stations')).toBeVisible()
  await expect(numbers.locator('span.text-4xl').first()).toHaveText(/^\d[\d,]*$/)

  await page.getByRole('button', { name: 'How it works' }).click()
  await expect(page.getByRole('heading', { name: 'How it works' })).toBeInViewport()

  await page.getByRole('main').getByRole('link', { name: 'Staff login' }).first().click()
  await expect(page).toHaveURL(/#\/login$/)
})

test('a Backoffice user lands on the dashboard with live numbers', async ({ page, request }) => {
  await registerProsumer(request)
  await loginAs(page, 'admin')

  await expect(page).toHaveURL(/#\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  const numbers = page.getByRole('region', { name: 'Live numbers' })
  await expect(numbers.getByText('Waiting for approval')).toBeVisible()
  await expect(numbers.getByText(/^of \d+ stations$/)).toBeVisible()
  await expect(page.getByText(/^Updated \d{2}:\d{2}$/)).toBeVisible()
  await expect(page.getByRole('list', { name: 'Next bookings' }).getByRole('listitem').first()).toBeVisible()

  // The new sign-up is counted in the menu.
  const menu = page.getByRole('navigation', { name: 'Main menu' })
  await expect(menu.getByRole('link', { name: /^Pending activations \(\d+ waiting\)$/ })).toBeVisible()
})

test('a Grid Operator lands on the operations page', async ({ page }) => {
  await loginAs(page, 'operator')

  await expect(page).toHaveURL(/#\/operations$/)
  await expect(page.getByRole('heading', { name: 'Operations' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Today at the stations' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open QR check-in' })).toBeVisible()

  const menu = page.getByRole('navigation', { name: 'Main menu' })
  await expect(menu.getByRole('link', { name: 'Dashboard' })).toHaveCount(0)
  await expect(menu.getByRole('link', { name: /Pending activations/ })).toHaveCount(0)
})

test('each role only opens its own home page', async ({ page }) => {
  await loginAs(page, 'operator')
  await page.goto('/#/dashboard')
  await expect(page.getByRole('heading', { name: 'This page is for Backoffice staff' })).toBeVisible()
  await page.goto('/#/activations')
  await expect(page.getByRole('heading', { name: 'This page is for Backoffice staff' })).toBeVisible()

  await page.getByRole('button', { name: /^Account menu for / }).click()
  await page.getByRole('button', { name: 'Log out' }).last().click()

  await loginAs(page, 'admin')
  await page.goto('/#/operations')
  await expect(page.getByRole('heading', { name: 'This page is for Grid Operator staff' })).toBeVisible()
})
