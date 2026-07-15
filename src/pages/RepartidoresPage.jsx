import { useMemo, useState } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import CrudTable from '../components/CrudTable'
import CrudForm from '../components/CrudForm'
import SlideOver from '../components/ui/SlideOver'
import Button from '../components/ui/Button'

const TABLE = 'repartidor'
const ID_COLUMN = 'id'

function cleanValues(values) {
  const out = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = v === '' ? undefined : v
  }
  return out
}

export default function RepartidoresPage() {
  const { rows: repartidores, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable(TABLE, { 
    orderBy: 'nombre', 
    ascending: true
  })
  const { rows: tipos } = useSupabaseTable('tipo_repartidor')

  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [textFilter, setTextFilter] = useState('')

  const tipoMap = useMemo(() => Object.fromEntries(tipos.map((t) => [t.id, t.nombre])), [tipos])

  const filteredData = useMemo(() => {
    if (!repartidores) return []
    if (!textFilter.trim()) return repartidores
    const lower = textFilter.toLowerCase()
    return repartidores.filter(r => (r.nombre || '').toLowerCase().includes(lower))
  }, [repartidores, textFilter])

  const columns = [
    { key: ID_COLUMN, label: '#' },
    { key: 'nombre', label: 'Nombre del Repartidor' },
    { key: 'tipo_repartidor', label: 'Tipo / Empresa', render: (row) => tipoMap[row.tipo_repartidor] ?? row.tipo_repartidor },
  ]

  const fields = [
    { key: 'nombre', label: 'Nombre / Placa', type: 'text', required: true },
    {
      key: 'tipo_repartidor',
      label: 'Tipo de Repartidor',
      type: 'select',
      required: true,
      options: tipos.map((t) => ({ value: t.id, label: t.nombre })),
    },
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
    if (!confirm(`¿Eliminar al repartidor ${row.nombre}?`)) return
    try {
      await deleteRow(row[ID_COLUMN], ID_COLUMN)
    } catch (err) {
      if (err.message?.includes('violates foreign key constraint')) {
        alert('No se puede eliminar porque este repartidor tiene entregas asociadas.')
      } else {
        alert(`No se pudo eliminar: ${err.message}`)
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-tomato-400">Logística · Módulo</p>
          <h1 className="font-display text-3xl text-semolina-100">Repartidores</h1>
        </div>
        <Button onClick={() => { setEditingRow(null); setOpen(true) }}>+ Nuevo repartidor</Button>
      </div>

      <div className="mb-6 rounded-xl border border-oven-700 bg-oven-900/50 p-5 shadow-sm backdrop-blur-sm transition-all">
        <div className="flex w-full items-center gap-3 rounded-lg bg-oven-950/50 p-2 border border-oven-800 focus-within:border-tomato-500 focus-within:ring-1 focus-within:ring-tomato-500">
          <input 
            type="text" 
            placeholder="Buscar por nombre..."
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
        emptyMessage="No hay repartidores registrados."
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        subtitle={editingRow ? `Repartidor #${editingRow[ID_COLUMN]}` : 'Nuevo repartidor'}
        title={editingRow ? 'Editar' : 'Registrar'}
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
