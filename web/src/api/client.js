/*
 * File:    client.js
 * Module:  Core (API access)
 * Owner:   Ravindu
 * Purpose: The one place that talks HTTP. It adds the login token to every
 *          request, reacts to expired sessions and turns API errors into
 *          plain messages. The web app has no business rules of its own.
 * Source:  WEB-05 (Axios instance and interceptors).
 */
import axios from 'axios'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')

const client = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 20000,
  headers: { Accept: 'application/json' },
})

let readToken = () => null
let handleSessionEnd = () => {}

// Connects the client to the signed-in session (called by AuthProvider).
export function configureClient({ getToken, onSessionEnd }) {
  readToken = getToken
  handleSessionEnd = onSessionEnd
}

client.interceptors.request.use((config) => {
  const token = readToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 with a token means the session is no longer valid (expired,
    // deactivated or role changed), so the user is sent back to the login page.
    const sentToken = error.config?.headers?.Authorization
    if (error.response?.status === 401 && sentToken) {
      handleSessionEnd(getErrorMessage(error))
    }
    return Promise.reject(error)
  },
)

// Picks the most useful text to show for a failed request.
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const problem = error?.response?.data
  if (problem && typeof problem === 'object') {
    if (problem.detail) return problem.detail
    if (problem.title) return problem.title
  }

  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return 'The server took too long to answer. Please try again.'
  }
  if (error?.isAxiosError && !error.response) {
    return `Cannot reach the API at ${API_URL}. Check that the server is running.`
  }

  switch (error?.response?.status) {
    case 401:
      return 'Your session has ended. Please log in again.'
    case 403:
      return 'You do not have permission to do this.'
    case 404:
      return 'The record was not found.'
    default:
      return error?.isAxiosError ? fallback : error?.message || fallback
  }
}

// Turns the API's validation list into { fieldName: firstMessage }.
// The API sends names such as "FullName" or "$.role"; forms use "fullName" and "role".
export function getFieldErrors(error) {
  const errors = error?.response?.data?.errors
  if (!errors || typeof errors !== 'object') return {}

  return Object.entries(errors).reduce((result, [key, messages]) => {
    const isJsonError = key.startsWith('$')
    const name = key
      .replace(/^\$\.?/, '')
      .split('.')
      .map((part) => part.charAt(0).toLowerCase() + part.slice(1))
      .join('.')

    if (name && !result[name]) {
      result[name] = isJsonError ? 'This value is not valid.' : [].concat(messages)[0]
    }
    return result
  }, {})
}

export default client
