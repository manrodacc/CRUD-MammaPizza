export default function SlideOver({ open, title, subtitle, onClose, children }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-oven-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-oven-800 shadow-2xl">
        <div className="ticket-edge" />
        <div className="flex items-start justify-between border-b border-oven-600 px-6 py-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-tomato-400">{subtitle}</p>
            <h2 className="font-display text-2xl text-semolina-100">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-semolina-500 hover:bg-oven-700 hover:text-semolina-100"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
