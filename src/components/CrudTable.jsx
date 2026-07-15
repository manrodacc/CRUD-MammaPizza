import Button from './ui/Button'

/**
 * Tabla genérica de CRUD.
 *
 * columns: [{ key, label, render?(row) }]
 * rows: array de objetos
 * onEdit, onDelete: callbacks(row)
 */
export default function CrudTable({ columns, rows, loading, error, onEdit, onDelete, emptyMessage }) {
  if (loading) {
    return <p className="py-10 text-center text-sm text-semolina-500">Cargando…</p>
  }

  if (error) {
    return (
      <p className="rounded-md border border-tomato-500/40 bg-tomato-500/10 px-4 py-3 text-sm text-tomato-300">
        Error al cargar los datos: {error.message}
      </p>
    )
  }

  if (!rows.length) {
    return (
      <div className="rounded-md border border-dashed border-oven-600 py-12 text-center text-sm text-semolina-500">
        {emptyMessage ?? 'Todavía no hay registros.'}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-oven-700">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-oven-700 bg-oven-900/60">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-mono text-xs uppercase tracking-wide text-semolina-500">
                {col.label}
              </th>
            ))}
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              className="border-b border-oven-700/60 last:border-0 hover:bg-oven-700/30"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-semolina-200">
                  {col.render ? col.render(row) : (row[col.key] ?? '—')}
                </td>
              ))}
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => onEdit(row)}>
                    Editar
                  </Button>
                  <Button variant="danger" className="px-2.5 py-1 text-xs" onClick={() => onDelete(row)}>
                    Eliminar
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
