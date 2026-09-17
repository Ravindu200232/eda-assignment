/*
 * File:    fieldContext.js
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Lets a form control pick up the id, hint and error state from the
 *          <Field> around it, so labels and messages are linked automatically.
 * Source:  WEB-06 (React context and useId).
 */
import { createContext, useContext } from 'react'

export const FieldContext = createContext(null)

// Returns the props a control needs from its surrounding Field (or nothing).
export function useFieldProps() {
  const field = useContext(FieldContext)
  if (!field) return {}

  return {
    id: field.id,
    'aria-describedby': field.describedBy,
    'aria-invalid': field.invalid || undefined,
    required: field.required || undefined,
  }
}
