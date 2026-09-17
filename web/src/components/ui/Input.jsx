/*
 * File:    Input.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Recessed text input. An optional icon sits inside on the left.
 * Source:  WEB-01 (claymorphism recessed input).
 */
import { cn } from '../../utils/cn'
import { useFieldProps } from './fieldContext'
import { controlClasses } from './styles'

// Text input that follows the surrounding Field for id and error state.
export default function Input({ size = 'md', icon: Icon, className, readOnly, ...rest }) {
  const fieldProps = useFieldProps()
  const input = (
    <input
      {...fieldProps}
      readOnly={readOnly}
      className={controlClasses({
        size,
        className: cn(Icon && (size === 'sm' ? 'pl-11' : 'pl-13'), readOnly && 'cursor-default opacity-80', className),
      })}
      {...rest}
    />
  )

  if (!Icon) return input

  return (
    <div className="relative">
      <Icon
        aria-hidden="true"
        className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted', size === 'sm' ? 'left-4 size-4' : 'left-5 size-5')}
      />
      {input}
    </div>
  )
}
