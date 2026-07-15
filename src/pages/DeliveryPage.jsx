import { useMemo, useState } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import CrudTable from '../components/CrudTable'
import CrudForm from '../components/CrudForm'
import SlideOver from '../components/ui/SlideOver'
import Button from '../components/ui/Button'

const TABLE = 'delivery'
const ID_COLUMN = 'id'

function cleanValues(values) {
  const out = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = v === '' ? undefined : v
  }
  return out
}

export default function DeliveryPage() {
  const {
    rows: deliveries,
    loading,
    error,
    insertRow,
    updateRow,
    deleteRow,
  } = useSupabaseTable(TABLE, { orderBy: ID_COLUMN, ascending: false })

  const { rows: pedidos } = useSupabaseTable('pedido')
  const { rows: repartidores } = useSupabaseTable('repartidor')

  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [textFilter, setTextFilter] = useState('')

  const repartidorMap = useMemo(() => Object.fromEntries(repartidores.map((r) => [r.id, r.nombre])), [repartidores])

  const filteredDelivery = useMemo(() => {
    if (!deliveries) return []
    if (!textFilter.trim()) return deliveries
    const lower = textFilter.toLowerCase()
    return deliveries.filter(d => {
      const dir = d.direccion_entrega?.toLowerCase() || ''
      const rep = (repartidorMap[d.repartidor] || '').toLowerCase()
      return dir.includes(lower) || rep.includes(lower) || String(d.pedido).includes(lower)
    })
  }, [deliveries, textFilter, repartidorMap])

  const columns = [
    { key: ID_COLUMN, label: '#' },
    { key: 'pedido', label: 'Pedido N°', render: (row) => `#${row.pedido}` },
    { key: 'repartidor', label: 'Repartidor', render: (row) => repartidorMap[row.repartidor] ?? row.repartidor },
    { key: 'direccion_entrega', label: 'Dirección de Entrega' },
    { key: 'costo_delivery', label: 'Costo (S/)', render: (row) => `S/ ${Number(row.costo_delivery).toFixed(2)}` },
  ]

  const fields = [
    {
      key: 'pedido',
      label: 'Pedido asociado',
      type: 'select',
      required: true,
      options: pedidos.map((p) => ({ value: p.id, label: `Pedido #${p.id}` })),
    },
    {
      key: 'repartidor',
      label: 'Repartidor',
      type: 'select',
      required: true,
      options: repartidores.map((r) => ({ value: r.id, label: r.nombre })),
    },
    { key: 'direccion_entrega', label: 'Dirección de Entrega', type: 'text', required: true },
    { key: 'costo_delivery', label: 'Costo del Delivery', type: 'number', required: true },
  ]

  const openCreate = () => {
    setEditingRow(null)
    setOpen(true)
  }

  const openEdit = (row) => {
    setEditingRow(row)
    setOpen(true)
  }

  const handleSubmit = async (rawValues) => {
    setSubmitting(true)
    try {
      const values = cleanValues(rawValues)
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
    if (!confirm(`¿Eliminar el delivery #${row[ID_COLUMN]}? Esta acción no se puede deshacer.`)) return
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
          <p className="font-mono text-xs uppercase tracking-widest text-tomato-400">Logística · Módulo</p>
          <h1 className="font-display text-3xl text-semolina-100">Delivery</h1>
        </div>
        <Button onClick={openCreate}>+ Nuevo delivery</Button>
      </div>

      <div className="mb-6 rounded-xl border border-oven-700 bg-oven-900/50 p-5 shadow-sm backdrop-blur-sm transition-all">
        <div className="mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-tomato-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h2 className="font-display text-lg text-semolina-200">Filtros Inteligentes</h2>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex w-full items-center gap-3 rounded-lg bg-oven-950/50 p-2 border border-oven-800 focus-within:border-tomato-500 focus-within:ring-1 focus-within:ring-tomato-500">
            <input 
              type="text" 
              placeholder="Buscar por N° Pedido, Dirección o Repartidor..."
              className="w-full bg-transparent px-3 py-1.5 text-sm text-semolina-100 focus:outline-none placeholder-semolina-500/50"
              value={textFilter}
              onChange={(e) => setTextFilter(e.target.value)}
            />
            {textFilter && (
              <button onClick={() => setTextFilter('')} className="mr-2 text-semolina-500 hover:text-tomato-400">
                &times;
              </button>
            )}
          </div>
        </div>
      </div>

      <CrudTable
        columns={columns}
        rows={filteredDelivery}
        loading={loading}
        error={error}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyMessage="Todavía no hay deliveries registrados."
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        subtitle={editingRow ? `Delivery #${editingRow[ID_COLUMN]}` : 'Nuevo delivery'}
        title={editingRow ? 'Editar delivery' : 'Registrar delivery'}
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
