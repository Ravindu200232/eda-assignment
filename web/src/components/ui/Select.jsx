/*
 * File:    Select.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Recessed drop-down list. Options are passed as { value, label }.
 */
import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useFieldProps } from './fieldContext'
import { controlClasses } from './styles'

// Native select with the clay look and a chevron.
export default function Select({ options, placeholder, size = 'md', className, ...rest }) {
  const fieldProps = useFieldProps()

  return (
    <div className={cn('relative', className)}>
      <select {...fieldProps} className={controlClasses({ size, className: 'cursor-pointer appearance-none pr-12' })} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted" />
    </div>
  )
}
