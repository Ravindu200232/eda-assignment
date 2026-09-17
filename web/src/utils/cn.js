/*
 * File:    cn.js
 * Module:  Core utilities
 * Owner:   Ravindu
 * Purpose: Joins CSS class names and skips empty or false values.
 */

// Returns one class string, e.g. cn('a', isOn && 'b') -> 'a b'.
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
