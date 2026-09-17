/*
 * File:    apiError.js
 * Module:  Unit tests
 * Owner:   Ravindu
 * Purpose: Builds fake API errors in the same shape Axios gives the pages.
 */
import { AxiosError } from 'axios'

// Error with a ProblemDetails body, e.g. apiError(400, { detail: '...' }).
export function apiError(status, data) {
  const config = { headers: {} }
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, { status, data, headers: {}, config })
}

// A paged list answer as returned by the API.
export function pageOf(items, { page = 1, pageSize = 10, total = items.length } = {}) {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}
