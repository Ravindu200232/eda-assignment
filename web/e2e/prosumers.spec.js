/*
 * File:    prosumers.spec.js
 * Module:  Prosumer Accounts - end-to-end tests
 * Owner:   Malith
 * Purpose: Staff manage prosumer accounts (NIC is the key), Backoffice
 *          activates or rejects mobile sign-ups, and the API's deactivation
 *          rule is shown in the page.
 */
import { expect, test } from '@playwright/test'
import { accounts, loginAs, loginStatus, openFromMenu, registerProsumer, uniqueNic } from './helpers'

// Opens the prosumer list and searches for one person.
async function findProsumer(page, text) {
  await openFromMenu(page, 'Prosumers')
  await page.getByLabel('Search prosumers').fill(text)
  const row = page.getByRole('row').filter({ hasText: text })
  await expect(row).toHaveCount(1)
  return row
}

test('staff create, edit and deactivate a prosumer; only Backoffice reactivates', async ({ page, request }) => {
  const nic = uniqueNic()
  const name = `Amaya Ranasinghe ${nic.slice(-4)}`
  const email = `amaya.${nic}@test.solargrid.lk`

  // A Grid Operator registers the prosumer at the office.
  await loginAs(page, 'operator')
  await openFromMenu(page, 'Prosumers')
  await page.getByRole('button', { name: 'New prosumer' }).click()
  const form = page.getByRole('dialog', { name: 'New prosumer' })
  await form.getByLabel('NIC', { exact: true }).fill(nic)
  await form.getByLabel('Full name').fill(name)
  await form.getByLabel('Email').fill(email)
  await form.getByLabel('Phone').fill('0777654321')
  await form.getByLabel('Home address').fill('No. 5, Lake Road, Kurunegala')
  await form.getByLabel('Solar panel capacity (kW)').fill('6.4')
  await form.getByLabel('Password', { exact: true }).fill('Prosumer@456')
  await form.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText(`${name}'s account is ready to use.`)).toBeVisible()
  expect(await loginStatus(request, email, 'Prosumer@456')).toBe(200)

  // Find and edit.
  const row = await findProsumer(page, nic)
  await expect(row.getByText('Active', { exact: true })).toBeVisible()
  await expect(row.getByText('6.4 kW')).toBeVisible()
  await row.getByRole('button', { name: `Edit ${name}` }).click()
  const edit = page.getByRole('dialog', { name: 'Edit prosumer' })
  await expect(edit.getByLabel('NIC', { exact: true })).toHaveAttribute('readonly')
  await edit.getByLabel('Electricity meter number').fill('CEB-KUR-55501')
  await edit.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText(`${name} was updated.`)).toBeVisible()
  await expect(row.getByText('CEB-KUR-55501')).toBeVisible()

  // Deactivate; the operator cannot bring the account back.
  await row.getByRole('button', { name: 'Deactivate' }).click()
  await page.getByRole('dialog', { name: 'Deactivate this account?' }).getByRole('button', { name: 'Deactivate' }).click()
  await expect(page.getByText(`${name} is now deactivated.`)).toBeVisible()
  await expect(row.getByText('Only Backoffice can reactivate')).toBeVisible()
  expect(await loginStatus(request, email, 'Prosumer@456')).toBe(403)

  // Backoffice reactivates from the details page.
  await page.getByRole('button', { name: /^Account menu for / }).click()
  await page.getByRole('button', { name: 'Log out' }).last().click()
  await loginAs(page, 'admin')
  await page.goto(`/#/prosumers/${nic}`)
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  await page.getByRole('button', { name: 'Reactivate' }).click()
  await page.getByRole('dialog', { name: 'Reactivate this account?' }).getByRole('button', { name: 'Reactivate' }).click()
  await expect(page.getByText(`${name} is active again.`)).toBeVisible()
  expect(await loginStatus(request, email, 'Prosumer@456')).toBe(200)
})

test('Backoffice activates a sign-up from the mobile app', async ({ page, request }) => {
  const signUp = await registerProsumer(request)
  expect(await loginStatus(request, signUp.email, signUp.password)).toBe(403)

  await loginAs(page, 'admin')
  await openFromMenu(page, /Pending activations/)
  const card = page.getByRole('article', { name: `Sign-up from ${signUp.fullName}` })
  await expect(card.getByText(signUp.nic, { exact: true })).toBeVisible()
  await card.getByRole('button', { name: 'Activate' }).click()

  await expect(page.getByText(`${signUp.fullName} can now log in to the mobile app.`)).toBeVisible()
  await expect(card).toHaveCount(0)
  expect(await loginStatus(request, signUp.email, signUp.password)).toBe(200)
})

test('Backoffice rejects a sign-up after confirming', async ({ page, request }) => {
  const signUp = await registerProsumer(request)

  await loginAs(page, 'admin')
  await page.goto('/#/activations')
  const card = page.getByRole('article', { name: `Sign-up from ${signUp.fullName}` })
  await card.getByRole('button', { name: 'Reject' }).click()
  await page.getByRole('dialog', { name: 'Reject this sign-up?' }).getByRole('button', { name: 'Reject sign-up' }).click()

  await expect(page.getByText(`${signUp.fullName}'s sign-up was rejected.`)).toBeVisible()
  await expect(card).toHaveCount(0)
  expect(await loginStatus(request, signUp.email, signUp.password)).toBe(403)

  const row = await findProsumer(page, signUp.nic)
  await expect(row.getByText('Deactivated')).toBeVisible()
})

test('a prosumer with upcoming bookings cannot be deactivated', async ({ page }) => {
  await loginAs(page, 'operator')
  const row = await findProsumer(page, accounts.prosumer.nic)

  await row.getByRole('button', { name: 'Deactivate' }).click()
  const dialog = page.getByRole('dialog', { name: 'Deactivate this account?' })
  await dialog.getByRole('button', { name: 'Deactivate' }).click()

  await expect(dialog.getByRole('alert')).toHaveText('This account has upcoming reservations. Cancel them before deactivating.')
  await dialog.getByRole('button', { name: 'Go back' }).click()
  await expect(row.getByText('Active', { exact: true })).toBeVisible()
})

test('the details page lists the prosumer bookings', async ({ page }) => {
  await loginAs(page, 'admin')
  const row = await findProsumer(page, accounts.prosumer.nic)
  await row.getByRole('link', { name: accounts.prosumer.name, exact: true }).click()

  await expect(page.getByRole('heading', { level: 1, name: accounts.prosumer.name })).toBeVisible()
  await expect(page.getByText('CEB-MLB-10021')).toBeVisible()
  const bookings = page.getByRole('table', { name: 'Prosumer bookings' })
  await expect(bookings.getByRole('link', { name: 'RSV-DEMO-0001' })).toBeVisible()
  await expect(bookings.getByRole('row').filter({ hasText: 'RSV-DEMO-0001' }).getByText('Completed')).toBeVisible()
})

test('a NIC can only be used once', async ({ page }) => {
  await loginAs(page, 'admin')
  await openFromMenu(page, 'Prosumers')
  await page.getByRole('button', { name: 'New prosumer' }).click()
  const form = page.getByRole('dialog', { name: 'New prosumer' })
  await form.getByLabel('NIC', { exact: true }).fill(accounts.prosumer.nic)
  await form.getByLabel('Full name').fill('Someone Else')
  await form.getByLabel('Email').fill(`else.${uniqueNic()}@test.solargrid.lk`)
  await form.getByLabel('Phone').fill('0771112233')
  await form.getByLabel('Home address').fill('No. 9, Other Road, Matara')
  await form.getByLabel('Password', { exact: true }).fill('Prosumer@456')
  await form.getByRole('button', { name: 'Create account' }).click()

  await expect(form.getByRole('alert')).toHaveText('An account with this NIC already exists.')
})
