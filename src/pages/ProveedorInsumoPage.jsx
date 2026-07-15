import { useMemo, useState } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import CrudTable from '../components/CrudTable'
import CrudForm from '../components/CrudForm'
import SlideOver from '../components/ui/SlideOver'
import Button from '../components/ui/Button'

const TABLE = 'proveedor_insumo'
const ID_COLUMN = 'id'

function cleanValues(values) {
  const out = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = v === '' ? undefined : v
  }
  return out
}

export default function ProveedorInsumoPage() {
  const { rows: proveedorInsumos, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable(TABLE, { 
    orderBy: ID_COLUMN, 
    ascending: false
  })

  const { rows: proveedores } = useSupabaseTable('proveedor')
  const { rows: insumos } = useSupabaseTable('insumo')

  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [textFilter, setTextFilter] = useState('')

  const proveedorMap = useMemo(() => Object.fromEntries(proveedores.map((p) => [p.id, p.razon_social])), [proveedores])
  const insumoMap = useMemo(() => Object.fromEntries(insumos.map((i) => [i.id, i.nombre])), [insumos])

  const filteredData = useMemo(() => {
    if (!proveedorInsumos) return []
    if (!textFilter.trim()) return proveedorInsumos
    const lower = textFilter.toLowerCase()
    return proveedorInsumos.filter(r => {
      const p = (proveedorMap[r.proveedor] || '').toLowerCase()
      const i = (insumoMap[r.insumo] || '').toLowerCase()
      return p.includes(lower) || i.includes(lower)
    })
  }, [proveedorInsumos, textFilter, proveedorMap, insumoMap])

  const columns = [
    { key: ID_COLUMN, label: '#' },
    { key: 'proveedor', label: 'Proveedor', render: (row) => proveedorMap[row.proveedor] ?? row.proveedor },
    { key: 'insumo', label: 'Insumo Provisto', render: (row) => insumoMap[row.insumo] ?? row.insumo },
  ]

  const fields = [
    {
      key: 'proveedor',
      label: 'Proveedor',
      type: 'select',
      required: true,
      options: proveedores.map((p) => ({ value: p.id, label: p.razon_social })),
    },
    {
      key: 'insumo',
      label: 'Insumo',
      type: 'select',
      required: true,
      options: insumos.map((i) => ({ value: i.id, label: i.nombre })),
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
    if (!confirm(`¿Eliminar la asociación?`)) return
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
          <p className="font-mono text-xs uppercase tracking-widest text-tomato-400">Proveedores · Módulo</p>
          <h1 className="font-display text-3xl text-semolina-100">Catálogo de Suministros</h1>
        </div>
        <Button onClick={() => { setEditingRow(null); setOpen(true) }}>+ Asociar Insumo a Proveedor</Button>
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
            placeholder="Buscar por nombre de proveedor o insumo..."
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
        emptyMessage="No hay asociaciones registradas."
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        subtitle={editingRow ? `Asociación #${editingRow[ID_COLUMN]}` : 'Nueva asociación'}
        title={editingRow ? 'Editar' : 'Registrar Suministro'}
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
