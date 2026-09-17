/*
 * File:    SearchInput.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Search box with a clear button. Pages debounce the value before
 *          calling the API.
 */
import { Search, X } from 'lucide-react'
import IconButton from './IconButton'
import Input from './Input'

// Search input. `onChange` receives the text, not the event.
export default function SearchInput({ value, onChange, label = 'Search', placeholder = 'Search…', size = 'md', className }) {
  return (
    <div className={className}>
      <div className="relative">
        <Input
          type="search"
          size={size}
          icon={Search}
          value={value}
          aria-label={label}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="pr-14 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <span className="absolute inset-y-0 right-1.5 flex items-center">
            <IconButton icon={X} label="Clear search" onClick={() => onChange('')} />
          </span>
        )}
      </div>
    </div>
  )
}
