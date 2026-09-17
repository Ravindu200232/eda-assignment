/*
 * File:    users.spec.js
 * Module:  Staff Users - end-to-end tests
 * Owner:   Ravindu
 * Purpose: Backoffice creates, finds, edits, deactivates and reactivates
 *          staff accounts; the API's rules are shown in the page.
 */
import { expect, test } from '@playwright/test'
import { API_URL, accounts, loginAs, openFromMenu, uniqueNic } from './helpers'

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'admin')
  await openFromMenu(page, 'Staff users')
  await expect(page.getByRole('heading', { name: 'Staff users' })).toBeVisible()
})

test('create, edit, deactivate and reactivate a Grid Operator', async ({ page, request }) => {
  const nic = uniqueNic()
  const name = `Sanduni Weerasinghe ${nic.slice(-4)}`
  const email = `sanduni.${nic}@test.solargrid.lk`

  // Create
  await page.getByRole('button', { name: 'New staff user' }).click()
  const form = page.getByRole('dialog', { name: 'New staff user' })
  await form.getByLabel('NIC', { exact: true }).fill(nic)
  await form.getByLabel('Full name').fill(name)
  await form.getByLabel('Email').fill(email)
  await form.getByLabel('Phone').fill('0712223344')
  await form.getByLabel('Password', { exact: true }).fill('Operator@456')
  await form.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText(`${name} can now log in.`)).toBeVisible()
  await expect(form).toBeHidden()

  // Find
  await page.getByLabel('Search staff users').fill(nic)
  const row = page.getByRole('row').filter({ hasText: nic })
  await expect(row).toHaveCount(1)
  await expect(row.getByText('Grid Operator')).toBeVisible()

  // Edit (phone and password reset)
  await row.getByRole('button', { name: `Edit ${name}` }).click()
  const edit = page.getByRole('dialog', { name: 'Edit staff user' })
  await expect(edit.getByLabel('NIC', { exact: true })).toHaveAttribute('readonly')
  await edit.getByLabel('Phone').fill('+94719998877')
  await edit.getByLabel('New password (optional)').fill('Operator@789')
  await edit.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText(`${name} was updated.`)).toBeVisible()
  await expect(row.getByText('+94719998877')).toBeVisible()

  const newPassword = await request.post(`${API_URL}/api/auth/login`, { data: { username: email, password: 'Operator@789' } })
  expect(newPassword.status()).toBe(200)

  // Deactivate: the account can no longer log in
  await row.getByRole('button', { name: 'Deactivate' }).click()
  await page.getByRole('dialog', { name: 'Deactivate this account?' }).getByRole('button', { name: 'Deactivate' }).click()
  await expect(page.getByText(`${name} is now deactivated.`)).toBeVisible()
  await expect(row.getByText('Deactivated')).toBeVisible()

  const blocked = await request.post(`${API_URL}/api/auth/login`, { data: { username: email, password: 'Operator@789' } })
  expect(blocked.status()).toBe(403)

  // Reactivate
  await row.getByRole('button', { name: 'Activate' }).click()
  await page.getByRole('dialog', { name: 'Activate this account?' }).getByRole('button', { name: 'Activate' }).click()
  await expect(page.getByText(`${name} is now active.`)).toBeVisible()
  await expect(row.getByText('Active', { exact: true })).toBeVisible()
})

test('a duplicate NIC is refused with the API message', async ({ page }) => {
  await page.getByRole('button', { name: 'New staff user' }).click()
  const form = page.getByRole('dialog', { name: 'New staff user' })
  await form.getByLabel('NIC', { exact: true }).fill(accounts.operator.nic)
  await form.getByLabel('Full name').fill('Copy Of Nimal')
  await form.getByLabel('Email').fill(`copy.${uniqueNic()}@test.solargrid.lk`)
  await form.getByLabel('Phone').fill('0771234567')
  await form.getByLabel('Password', { exact: true }).fill('Operator@456')
  await form.getByRole('button', { name: 'Create account' }).click()

  await expect(form.getByRole('alert')).toHaveText('A user with this NIC already exists.')
})

test('field rules from the API appear under the fields', async ({ page }) => {
  await page.getByRole('button', { name: 'New staff user' }).click()
  const form = page.getByRole('dialog', { name: 'New staff user' })
  await form.getByLabel('NIC', { exact: true }).fill(uniqueNic())
  await form.getByLabel('Full name').fill('Al')
  await form.getByLabel('Email').fill('not-an-email')
  await form.getByLabel('Phone').fill('12345')
  await form.getByLabel('Password', { exact: true }).fill('short')
  await form.getByRole('button', { name: 'Create account' }).click()

  await expect(form.getByText('Full name must be 3 to 100 characters.')).toBeVisible()
  await expect(form.getByText('Enter a valid email address.')).toBeVisible()
  await expect(form.getByText('Phone number must look like 0771234567 or +94771234567.')).toBeVisible()
  await expect(form.getByRole('alert')).toHaveText('Please check the highlighted fields.')
})

test('the list can be filtered by role and status', async ({ page }) => {
  await page.getByLabel('Filter by role').selectOption('GridOperator')
  await expect(page.getByRole('row').filter({ hasText: accounts.operator.name })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: accounts.admin.name })).toHaveCount(0)

  await page.getByLabel('Filter by role').selectOption('Backoffice')
  await expect(page.getByRole('row').filter({ hasText: accounts.admin.name })).toBeVisible()

  await page.getByRole('tab', { name: 'Deactivated' }).click()
  await expect(page.getByRole('row').filter({ hasText: accounts.admin.name })).toHaveCount(0)
})

test('Backoffice users cannot deactivate or demote themselves', async ({ page }) => {
  const myRow = page.getByRole('row').filter({ hasText: accounts.admin.name })
  await expect(myRow.getByText('You', { exact: true })).toBeVisible()
  await expect(myRow.getByRole('button', { name: 'Deactivate' })).toHaveCount(0)

  await myRow.getByRole('button', { name: `Edit ${accounts.admin.name}` }).click()
  await expect(page.getByRole('dialog').getByLabel('Role')).toBeDisabled()
})
