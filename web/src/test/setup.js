/*
 * File:    setup.js
 * Module:  Unit tests
 * Owner:   Ravindu
 * Purpose: Runs before every unit test file. Adds the jest-dom matchers and
 *          fills in browser features that jsdom does not have.
 * Source:  WEB-12 (Vitest and Testing Library set-up), WEB-09 (dialog element).
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

// jsdom has no showModal() / close(); the open attribute is enough for tests.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

// jsdom has no matchMedia; tests behave like a wide desktop screen.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: /min-width/.test(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })
}
