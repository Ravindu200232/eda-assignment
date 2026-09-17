/*
 * File:    client.test.js
 * Module:  Core (API access) - unit tests
 * Owner:   Ravindu
 * Purpose: Checks how API errors become messages, and that an expired token
 *          ends the session.
 */
import { AxiosError } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { apiError } from '../test/apiError'
import client, { API_URL, configureClient, getErrorMessage, getFieldErrors } from './client'

// Adapter that always answers with the given error (no real HTTP call).
function failingAdapter(status, data) {
  return vi.fn(async (config) => {
    throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, { status, data, headers: {}, config })
  })
}

describe('getErrorMessage', () => {
  it('uses the detail text from the API', () => {
    const error = apiError(400, { title: 'Request not allowed', detail: 'Bookings can be made at most 7 days ahead.' })
    expect(getErrorMessage(error)).toBe('Bookings can be made at most 7 days ahead.')
  })

  it('falls back to the title when there is no detail', () => {
    expect(getErrorMessage(apiError(409, { title: 'Conflict' }))).toBe('Conflict')
  })

  it('explains when the API cannot be reached', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK', { headers: {} })
    expect(getErrorMessage(error)).toBe(`Cannot reach the API at ${API_URL}. Check that the server is running.`)
  })

  it('explains a timeout', () => {
    const error = new AxiosError('timeout', 'ECONNABORTED', { headers: {} })
    expect(getErrorMessage(error)).toBe('The server took too long to answer. Please try again.')
  })

  it('gives plain text for an empty 403 answer', () => {
    expect(getErrorMessage(apiError(403, ''))).toBe('You do not have permission to do this.')
  })

  it('uses the message of an ordinary error', () => {
    expect(getErrorMessage(new Error('Prosumers use the app.'))).toBe('Prosumers use the app.')
  })
})

describe('getFieldErrors', () => {
  it('maps API field names to form field names', () => {
    const error = apiError(400, {
      errors: {
        FullName: ['Full name is required.'],
        Password: ['Password is required.', 'Second message'],
        'Schedule[0].OpenTime': ['Use HH:mm.'],
      },
    })

    expect(getFieldErrors(error)).toEqual({
      fullName: 'Full name is required.',
      password: 'Password is required.',
      'schedule[0].openTime': 'Use HH:mm.',
    })
  })

  it('turns JSON conversion errors into a friendly message', () => {
    const error = apiError(400, { errors: { '$.role': ['The JSON value could not be converted.'] } })
    expect(getFieldErrors(error)).toEqual({ role: 'This value is not valid.' })
  })

  it('returns an empty object when there are no field errors', () => {
    expect(getFieldErrors(apiError(400, { detail: 'Not allowed' }))).toEqual({})
    expect(getFieldErrors(new Error('x'))).toEqual({})
  })
})

describe('session handling', () => {
  it('sends the token and ends the session when the API rejects it', async () => {
    const onSessionEnd = vi.fn()
    configureClient({ getToken: () => 'token-123', onSessionEnd })
    const adapter = failingAdapter(401, { detail: 'Your session has expired. Please log in again.' })

    await expect(client.get('/users', { adapter })).rejects.toBeInstanceOf(AxiosError)

    expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer token-123')
    expect(onSessionEnd).toHaveBeenCalledWith('Your session has expired. Please log in again.')
  })

  it('keeps the login page in charge when a login without token fails', async () => {
    const onSessionEnd = vi.fn()
    configureClient({ getToken: () => null, onSessionEnd })

    await expect(
      client.post('/auth/login', {}, { adapter: failingAdapter(401, { detail: 'Incorrect NIC/email or password.' }) }),
    ).rejects.toBeInstanceOf(AxiosError)

    expect(onSessionEnd).not.toHaveBeenCalled()
  })
})
