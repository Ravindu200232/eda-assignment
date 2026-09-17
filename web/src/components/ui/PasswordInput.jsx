/*
 * File:    PasswordInput.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Password box with a button that shows or hides what was typed.
 */
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../utils/cn'
import IconButton from './IconButton'
import Input from './Input'

// Password input with a show/hide toggle.
export default function PasswordInput({ className, ...rest }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input {...rest} type={visible ? 'text' : 'password'} className={cn('pr-14', className)} />
      <span className="absolute inset-y-0 right-1.5 flex items-center">
        <IconButton
          icon={visible ? EyeOff : Eye}
          label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        />
      </span>
    </div>
  )
}
