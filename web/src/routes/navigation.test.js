/*
 * File:    navigation.test.js
 * Module:  Core (navigation) - unit tests
 * Owner:   Ravindu
 * Purpose: Checks the menu per role, the landing page after login and the
 *          safe return to a requested page.
 */
import { describe, expect, it } from 'vitest'
import { Roles } from '../utils/roles'
import { groupBySection, homePathFor, navItemsFor, pathAfterLogin } from './navigation'

const items = [
  { to: '/dashboard', label: 'Dashboard', section: 'Overview', roles: [Roles.Backoffice] },
  { to: '/operations', label: 'Operations', section: 'Overview', roles: [Roles.GridOperator] },
  { to: '/users', label: 'Staff users', section: 'People', roles: [Roles.Backoffice] },
  { to: '/check-in', label: 'QR check-in', section: 'Operations', roles: [Roles.Backoffice, Roles.GridOperator] },
]

describe('menu per role', () => {
  it('lists only the entries a role may open', () => {
    expect(navItemsFor(Roles.GridOperator, items).map((item) => item.to)).toEqual(['/operations', '/check-in'])
    expect(navItemsFor(Roles.Prosumer, items)).toEqual([])
  })

  it('groups entries by section in menu order', () => {
    const sections = groupBySection(navItemsFor(Roles.Backoffice, items))
    expect(sections.map((section) => section.name)).toEqual(['Overview', 'People', 'Operations'])
    expect(sections[0].items.map((item) => item.to)).toEqual(['/dashboard'])
  })
})

describe('landing page', () => {
  it('sends each role to the first page it may open', () => {
    expect(homePathFor(Roles.Backoffice, items)).toBe('/dashboard')
    expect(homePathFor(Roles.GridOperator, items)).toBe('/operations')
  })

  it('uses the account page when a role has no menu entries', () => {
    expect(homePathFor(Roles.Prosumer, items)).toBe('/account')
  })
})

describe('return after login', () => {
  it('returns to the requested page when the role may open it', () => {
    expect(pathAfterLogin('/check-in?x=1', Roles.GridOperator, items)).toBe('/check-in?x=1')
    expect(pathAfterLogin('/users/199023456789', Roles.Backoffice, items)).toBe('/users/199023456789')
    expect(pathAfterLogin('/account', Roles.GridOperator, items)).toBe('/account')
  })

  it('goes home for pages the role may not open', () => {
    expect(pathAfterLogin('/users', Roles.GridOperator, items)).toBe('/operations')
  })

  it('ignores empty, outside and login paths', () => {
    expect(pathAfterLogin(undefined, Roles.Backoffice, items)).toBe('/dashboard')
    expect(pathAfterLogin('//evil.example.com', Roles.Backoffice, items)).toBe('/dashboard')
    expect(pathAfterLogin('https://evil.example.com', Roles.Backoffice, items)).toBe('/dashboard')
    expect(pathAfterLogin('/login', Roles.Backoffice, items)).toBe('/dashboard')
    expect(pathAfterLogin('/', Roles.GridOperator, items)).toBe('/operations')
  })
})
