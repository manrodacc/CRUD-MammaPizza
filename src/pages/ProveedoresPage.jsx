import { useMemo, useState, useEffect } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import CrudTable from '../components/CrudTable'
import CrudForm from '../components/CrudForm'
import SlideOver from '../components/ui/SlideOver'
import Button from '../components/ui/Button'

const TABLE = 'proveedor'
const ID_COLUMN = 'id'

function cleanValues(values) {
  const out = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = v === '' ? undefined : v
  }
  return out
}

const formatDireccion = (d) => [d.calle, d.numero, d.distrito].filter(Boolean).join(', ')

export default function ProveedoresPage() {
  const [textFilter, setTextFilter] = useState('')
  const [debouncedText, setDebouncedText] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedText(textFilter), 400)
    return () => clearTimeout(t)
  }, [textFilter])

  const { rows: proveedores, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable(TABLE, { 
    orderBy: 'razon_social', 
    ascending: true,
    searchColumn: debouncedText ? 'razon_social' : undefined,
    searchValue: debouncedText || undefined
  })

  const { rows: direcciones } = useSupabaseTable('direccion')

  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const direccionMap = useMemo(() => Object.fromEntries(direcciones.map((d) => [d.id, formatDireccion(d)])), [direcciones])

  const columns = [
    { key: ID_COLUMN, label: '#' },
    { key: 'ruc', label: 'RUC' },
    { key: 'razon_social', label: 'Razón Social' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'email', label: 'Email' },
    { key: 'direccion', label: 'Dirección', render: (row) => direccionMap[row.direccion] ?? row.direccion },
  ]

  const fields = [
    { key: 'ruc', label: 'RUC', type: 'text', required: true },
    { key: 'razon_social', label: 'Razón Social', type: 'text', required: true },
    { key: 'telefono', label: 'Teléfono', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'text' },
    {
      key: 'direccion',
      label: 'Dirección',
      type: 'select',
      required: true,
      options: direcciones.map((d) => ({ value: d.id, label: formatDireccion(d) || `Dir #${d.id}` })),
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
      if (err.message?.includes('violates unique constraint')) {
        alert('No se pudo guardar: Ya existe un proveedor con ese RUC.')
      } else {
        alert(`No se pudo guardar: ${err.message}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (row) => {
    if (!confirm(`¿Eliminar al proveedor "${row.razon_social}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteRow(row[ID_COLUMN], ID_COLUMN)
    } catch (err) {
      if (err.message?.includes('violates foreign key constraint')) {
        alert('No se puede eliminar porque este proveedor tiene insumos asociados.')
      } else {
        alert(`No se pudo eliminar: ${err.message}`)
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-tomato-400">Proveedores · Módulo</p>
          <h1 className="font-display text-3xl text-semolina-100">Proveedores</h1>
        </div>
        <Button onClick={() => { setEditingRow(null); setOpen(true) }}>+ Nuevo proveedor</Button>
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
            placeholder="Buscar por Razón Social..."
            className="w-full bg-transparent px-3 py-1.5 text-sm text-semolina-100 focus:outline-none placeholder-semolina-500/50"
            value={textFilter}
            onChange={(e) => setTextFilter(e.target.value)}
          />
        </div>
      </div>

      <CrudTable
        columns={columns}
        rows={proveedores}
        loading={loading}
        error={error}
        onEdit={(r) => { setEditingRow(r); setOpen(true) }}
        onDelete={handleDelete}
        emptyMessage="Todavía no hay proveedores registrados."
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        subtitle={editingRow ? `Proveedor #${editingRow[ID_COLUMN]}` : 'Nuevo proveedor'}
        title={editingRow ? 'Editar proveedor' : 'Registrar proveedor'}
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
