const variants = {
  primary: 'bg-tomato-500 hover:bg-tomato-400 text-semolina-100 border-transparent',
  ghost: 'bg-transparent hover:bg-oven-700 text-semolina-200 border-oven-600',
  danger: 'bg-transparent hover:bg-tomato-500/10 text-tomato-400 border-tomato-500/40',
}

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-medium
        transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
