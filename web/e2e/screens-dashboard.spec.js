/*
 * File:    screens-dashboard.spec.js
 * Module:  Dashboards and Prosumer Accounts - report screenshots
 * Owner:   Malith
 * Purpose: Screenshots of the home page, both dashboards and the prosumer
 *          pages (run with npm run e2e:screens). The desktop home page is
 *          also saved as docs/screenshots/web/00-home.png for the submission.
 */
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { accounts, loginAs, openFromMenu } from './helpers'
import { SCREENSHOT_DIR, screenTests, shoot } from './screens'

screenTests('dashboards and prosumers', (size) => {
  test('home page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('region', { name: 'Live from the grid' }).locator('span.text-4xl').first()).toHaveText(/\d/)
    await shoot(page, size, '00-home')

    if (size === 'desktop') {
      await page.screenshot({ path: join(SCREENSHOT_DIR, '00-home.png'), animations: 'disabled' })
    }
  })

  test('backoffice dashboard', async ({ page }) => {
    await loginAs(page, 'admin')
    await expect(page.getByRole('list', { name: 'Next bookings' })).toBeVisible()
    await shoot(page, size, '02-dashboard')
  })

  test('operations page', async ({ page }) => {
    await loginAs(page, 'operator')
    await expect(page.getByRole('heading', { name: 'Today at the stations' })).toBeVisible()
    await expect(page.getByText(/^Updated /)).toBeVisible()
    await shoot(page, size, '03-operations')
  })

  test('prosumer pages', async ({ page }) => {
    await loginAs(page, 'admin')
    await openFromMenu(page, 'Prosumers')
    await expect(page.getByText(accounts.prosumer.name).first()).toBeVisible()
    await shoot(page, size, '20-prosumers')

    await page.getByRole('button', { name: 'New prosumer' }).click()
    await expect(page.getByRole('dialog', { name: 'New prosumer' })).toBeVisible()
    await shoot(page, size, '21-prosumer-form')
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()

    await page.goto(`/#/prosumers/${accounts.prosumer.nic}`)
    await expect(page.getByRole('table', { name: 'Prosumer bookings' }).or(page.getByRole('list', { name: 'Prosumer bookings' }))).toBeVisible()
    await shoot(page, size, '22-prosumer-details')

    await page.goto('/#/activations')
    await expect(page.getByRole('article').first()).toBeVisible()
    await shoot(page, size, '23-activations')
  })
})
