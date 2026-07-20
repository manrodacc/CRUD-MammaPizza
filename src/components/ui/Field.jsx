export default function Field({ label, required, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-semolina-500">
        {label}
        {required && <span className="text-tomato-400">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-semolina-500">{hint}</span>}
    </label>
  )
}

const baseInputClasses =
  'w-full rounded-md border border-oven-600 bg-oven-900 px-3 py-2 text-sm text-semolina-100 ' +
  'placeholder:text-semolina-500 focus:border-tomato-400 focus:outline-none focus:ring-1 focus:ring-tomato-400'

export function TextInput(props) {
  return <input className={baseInputClasses} {...props} />
}

export function TextArea(props) {
  return <textarea className={`${baseInputClasses} min-h-20 resize-y`} {...props} />
}

export function SelectInput({ children, ...props }) {
  return (
    <select className={baseInputClasses} {...props}>
      {children}
    </select>
  )
}

import { useState, useEffect, useRef } from 'react'

export function SearchableSelect({ options = [], value, onChange, placeholder = 'Selecciona...', required }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(o => String(o.value) === String(value))
  const displayValue = open ? search : (selectedOption ? selectedOption.label : '')

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        className={baseInputClasses}
        placeholder={placeholder}
        required={required && !value}
        value={displayValue}
        onChange={e => {
          setSearch(e.target.value)
          if (!open) setOpen(true)
          if (value) {
             onChange({ target: { value: '' } })
          }
        }}
        onClick={() => {
          setOpen(true)
          setSearch('')
        }}
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-oven-600 bg-oven-900 shadow-lg">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-semolina-500">No hay resultados</div>
          ) : (
            filteredOptions.map(opt => (
              <div
                key={opt.value}
                className="cursor-pointer px-3 py-2 text-sm text-semolina-100 hover:bg-tomato-500 hover:text-white"
                onClick={() => {
                  onChange({ target: { value: opt.value } })
                  setSearch('')
                  setOpen(false)
                }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
