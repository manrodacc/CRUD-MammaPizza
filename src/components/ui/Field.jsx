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
