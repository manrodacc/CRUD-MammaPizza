import { useMemo, useState } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import CrudTable from '../components/CrudTable'
import CrudForm from '../components/CrudForm'
import SlideOver from '../components/ui/SlideOver'
import Button from '../components/ui/Button'

const TABLE = 'direccion'
const ID_COLUMN = 'id'

function cleanValues(values) {
  const out = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = v === '' ? undefined : v
  }
  return out
}

export default function DireccionesPage() {
  const { rows: direcciones, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable(TABLE, { 
    orderBy: ID_COLUMN, 
    ascending: false
  })

  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [textFilter, setTextFilter] = useState('')

  const filteredData = useMemo(() => {
    if (!direcciones) return []
    if (!textFilter.trim()) return direcciones
    const lower = textFilter.toLowerCase()
    return direcciones.filter(r => {
      const fulldir = [r.departamento, r.provincia, r.distrito, r.calle, r.numero].filter(Boolean).join(' ').toLowerCase()
      return fulldir.includes(lower)
    })
  }, [direcciones, textFilter])

  const columns = [
    { key: ID_COLUMN, label: '#' },
    { key: 'departamento', label: 'Departamento' },
    { key: 'provincia', label: 'Provincia' },
    { key: 'distrito', label: 'Distrito' },
    { key: 'calle', label: 'Calle/Av' },
    { key: 'numero', label: 'Nro' },
  ]

  const fields = [
    { key: 'departamento', label: 'Departamento', type: 'text' },
    { key: 'provincia', label: 'Provincia', type: 'text' },
    { key: 'distrito', label: 'Distrito', type: 'text' },
    { key: 'urbanizacion', label: 'Urbanización', type: 'text' },
    { key: 'calle', label: 'Calle / Avenida', type: 'text', required: true },
    { key: 'numero', label: 'Número', type: 'text' },
    { key: 'referencia', label: 'Referencia', type: 'textarea' },
  ]

  const handleSubmit = async (rawValues) => {
    setSubmitting(true)
    try {
      const values = cleanValues(rawValues)
      delete values[ID_COLUMN]
      if (editingRow) {
        await updateRow(editingRow[ID_COLUMN], ID_COLUMN, values)
      } else {
        await insertRow(values)
      }
      setOpen(false)
    } catch (err) {
      alert(`No se pudo guardar: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (row) => {
    if (!confirm(`¿Eliminar la dirección?`)) return
    try {
      await deleteRow(row[ID_COLUMN], ID_COLUMN)
    } catch (err) {
      if (err.message?.includes('violates foreign key constraint')) {
        alert('No se puede eliminar porque esta dirección está asignada a un cliente, empleado, proveedor o sede.')
      } else {
        alert(`No se pudo eliminar: ${err.message}`)
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-tomato-400">Operaciones · Módulo</p>
          <h1 className="font-display text-3xl text-semolina-100">Direcciones</h1>
        </div>
        <Button onClick={() => { setEditingRow(null); setOpen(true) }}>+ Nueva dirección</Button>
      </div>

      <div className="mb-6 rounded-xl border border-oven-700 bg-oven-900/50 p-5 shadow-sm backdrop-blur-sm transition-all">
        <div className="mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-tomato-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h2 className="font-display text-lg text-semolina-200">Buscador</h2>
        </div>
        
        <div className="flex w-full items-center gap-3 rounded-lg bg-oven-950/50 p-2 border border-oven-800 focus-within:border-tomato-500 focus-within:ring-1 focus-within:ring-tomato-500">
          <input 
            type="text" 
            placeholder="Buscar por distrito, calle, número..."
            className="w-full bg-transparent px-3 py-1.5 text-sm text-semolina-100 focus:outline-none placeholder-semolina-500/50"
            value={textFilter}
            onChange={(e) => setTextFilter(e.target.value)}
          />
        </div>
      </div>

      <CrudTable
        columns={columns}
        rows={filteredData}
        loading={loading}
        error={error}
        onEdit={(r) => { setEditingRow(r); setOpen(true) }}
        onDelete={handleDelete}
        emptyMessage="No hay direcciones registradas."
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        subtitle={editingRow ? `Dirección #${editingRow[ID_COLUMN]}` : 'Nueva dirección'}
        title={editingRow ? 'Editar' : 'Registrar Dirección'}
      >
        <CrudForm
          fields={fields}
          initialValues={editingRow ?? {}}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          submitting={submitting}
        />
      </SlideOver>
    </div>
  )
}
