/*
 * File:    FormAlert.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Error box at the top of a form. When the API listed problems for
 *          single fields, those are shown under the fields and this box only
 *          points to them; otherwise it shows the API's message.
 */
import Alert from './Alert'

// Shows nothing when there is no error.
export default function FormAlert({ error, fieldErrors = {} }) {
  if (!error) return null

  const hasFieldErrors = Object.keys(fieldErrors).length > 0
  return <Alert tone="danger">{hasFieldErrors ? 'Please check the highlighted fields.' : error}</Alert>
}
