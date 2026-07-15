import { useMemo, useState, useEffect } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import CrudTable from '../components/CrudTable'
import CrudForm from '../components/CrudForm'
import SlideOver from '../components/ui/SlideOver'
import Button from '../components/ui/Button'

const TABLE = 'detalle_venta'
const ID_COLUMN = 'id'

function cleanValues(values) {
  const out = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = v === '' ? undefined : v
  }
  return out
}

export default function DetalleVentaPage() {
  const [textFilter, setTextFilter] = useState('')
  const [debouncedText, setDebouncedText] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedText(textFilter), 400)
    return () => clearTimeout(t)
  }, [textFilter])

  const { rows: detalles, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable(TABLE, { 
    orderBy: ID_COLUMN, 
    ascending: false
  })

  // Cargar algunas ventas recientes
  const { rows: ventas } = useSupabaseTable('venta', { orderBy: 'id', ascending: false, limit: 100 })
  const { rows: productos } = useSupabaseTable('producto')

  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const productoMap = useMemo(() => Object.fromEntries(productos.map((p) => [p.id, p.nombre])), [productos])

  const filteredData = useMemo(() => {
    if (!detalles) return []
    if (!debouncedText.trim()) return detalles
    const lower = debouncedText.toLowerCase()
    return detalles.filter(r => 
      String(r.venta).includes(lower) || 
      (productoMap[r.producto] || '').toLowerCase().includes(lower)
    )
  }, [detalles, debouncedText, productoMap])

  const columns = [
    { key: ID_COLUMN, label: '#' },
    { key: 'venta', label: 'ID Venta', render: (row) => `#${row.venta}` },
    { key: 'producto', label: 'Producto', render: (row) => productoMap[row.producto] ?? row.producto },
    { key: 'cantidad_facturada', label: 'Cantidad', render: (row) => Number(row.cantidad_facturada) },
    { key: 'precio_facturado', label: 'P. Facturado', render: (row) => `S/ ${Number(row.precio_facturado).toFixed(2)}` },
    { key: 'subtotal', label: 'Subtotal', render: (row) => `S/ ${(Number(row.cantidad_facturada) * Number(row.precio_facturado)).toFixed(2)}` },
  ]

  const fields = [
    {
      key: 'venta',
      label: 'ID de Venta',
      type: 'select',
      required: true,
      options: ventas.map((v) => ({ value: v.id, label: `Venta #${v.id} (${v.serie_correlativo})` })),
    },
    {
      key: 'producto',
      label: 'Producto',
      type: 'select',
      required: true,
      options: productos.map((p) => ({ value: p.id, label: p.nombre })),
    },
    { key: 'cantidad_facturada', label: 'Cantidad Facturada', type: 'number', required: true },
    { key: 'precio_facturado', label: 'Precio Facturado (S/)', type: 'number', required: true },
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
    if (!confirm(`¿Eliminar el detalle de la venta #${row.venta}?`)) return
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
          <h1 className="font-display text-3xl text-semolina-100">Detalles de Venta</h1>
        </div>
        <Button onClick={() => { setEditingRow(null); setOpen(true) }}>+ Agregar detalle</Button>
      </div>

      <div className="mb-6 rounded-xl border border-oven-700 bg-oven-900/50 p-5 shadow-sm backdrop-blur-sm transition-all">
        <div className="flex w-full items-center gap-3 rounded-lg bg-oven-950/50 p-2 border border-oven-800 focus-within:border-tomato-500 focus-within:ring-1 focus-within:ring-tomato-500">
          <input 
            type="text" 
            placeholder="Buscar por ID de venta o nombre de producto..."
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
        emptyMessage="No hay detalles registrados en este rango."
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        subtitle={editingRow ? `Detalle #${editingRow[ID_COLUMN]}` : 'Nuevo detalle'}
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
