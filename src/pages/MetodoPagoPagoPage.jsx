import { useMemo, useState } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import CrudTable from '../components/CrudTable'
import CrudForm from '../components/CrudForm'
import SlideOver from '../components/ui/SlideOver'
import Button from '../components/ui/Button'

const TABLE = 'metodo_pago_pago'
const ID_COLUMN = 'id'

function cleanValues(values) {
  const out = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = v === '' ? undefined : v
  }
  return out
}

export default function MetodoPagoPagoPage() {
  const { rows: registros, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable(TABLE, { 
    orderBy: ID_COLUMN, 
    ascending: false
  })

  const { rows: metodos } = useSupabaseTable('metodo_pago')
  // Solo los pagos más recientes para no cargar miles
  const { rows: pagos } = useSupabaseTable('pago', { orderBy: 'id', ascending: false, limit: 100 })

  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [textFilter, setTextFilter] = useState('')

  const metodoMap = useMemo(() => Object.fromEntries(metodos.map((t) => [t.id, t.nombre])), [metodos])

  const filteredData = useMemo(() => {
    if (!registros) return []
    if (!textFilter.trim()) return registros
    const lower = textFilter.toLowerCase()
    return registros.filter(r => String(r.pago).includes(lower) || (metodoMap[r.metodo_pago] || '').toLowerCase().includes(lower))
  }, [registros, textFilter, metodoMap])

  const columns = [
    { key: ID_COLUMN, label: '#' },
    { key: 'pago', label: 'ID Pago', render: (row) => `#${row.pago}` },
    { key: 'metodo_pago', label: 'Método de Pago', render: (row) => metodoMap[row.metodo_pago] ?? row.metodo_pago },
  ]

  const fields = [
    {
      key: 'pago',
      label: 'ID del Pago',
      type: 'select',
      required: true,
      options: pagos.map((p) => ({ value: p.id, label: `Pago #${p.id} (S/ ${p.monto_total})` })),
    },
    {
      key: 'metodo_pago',
      label: 'Método Usado',
      type: 'select',
      required: true,
      options: metodos.map((t) => ({ value: t.id, label: t.nombre })),
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
    if (!confirm(`¿Eliminar este método del pago #${row.pago}?`)) return
    try {
      await deleteRow(row[ID_COLUMN], ID_COLUMN)
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message}`)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-tomato-400">Contabilidad · Módulo</p>
          <h1 className="font-display text-3xl text-semolina-100">Desglose de Pago</h1>
        </div>
        <Button onClick={() => { setEditingRow(null); setOpen(true) }}>+ Asociar método</Button>
      </div>

      <div className="mb-6 rounded-xl border border-oven-700 bg-oven-900/50 p-5 shadow-sm backdrop-blur-sm transition-all">
        <div className="flex w-full items-center gap-3 rounded-lg bg-oven-950/50 p-2 border border-oven-800 focus-within:border-tomato-500 focus-within:ring-1 focus-within:ring-tomato-500">
          <input 
            type="text" 
            placeholder="Buscar por ID de pago o método..."
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
        emptyMessage="No hay métodos asociados a pagos."
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        subtitle={editingRow ? `Registro #${editingRow[ID_COLUMN]}` : 'Nuevo desglose'}
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
