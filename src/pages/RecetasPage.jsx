import { useMemo, useState, useEffect } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import CrudTable from '../components/CrudTable'
import CrudForm from '../components/CrudForm'
import SlideOver from '../components/ui/SlideOver'
import Button from '../components/ui/Button'

const TABLE = 'receta'
const ID_COLUMN = 'id'

function cleanValues(values) {
  const out = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = v === '' ? undefined : v
  }
  return out
}

export default function RecetasPage() {
  const { rows: recetas, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable(TABLE, { 
    orderBy: ID_COLUMN, 
    ascending: false
  })

  const { rows: productos } = useSupabaseTable('producto')
  const { rows: insumos } = useSupabaseTable('insumo')
  const { rows: unidades } = useSupabaseTable('unidad_medida')

  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [textFilter, setTextFilter] = useState('')

  const productoMap = useMemo(() => Object.fromEntries(productos.map((p) => [p.id, p.nombre])), [productos])
  const insumoMap = useMemo(() => Object.fromEntries(insumos.map((i) => [i.id, i.nombre])), [insumos])
  const unidadMap = useMemo(() => Object.fromEntries(unidades.map((u) => [u.id, u.nombre])), [unidades])

  const filteredRecetas = useMemo(() => {
    if (!recetas) return []
    if (!textFilter.trim()) return recetas
    const lower = textFilter.toLowerCase()
    return recetas.filter(r => {
      const p = (productoMap[r.producto] || '').toLowerCase()
      const i = (insumoMap[r.insumo] || '').toLowerCase()
      return p.includes(lower) || i.includes(lower)
    })
  }, [recetas, textFilter, productoMap, insumoMap])

  const columns = [
    { key: ID_COLUMN, label: '#' },
    { key: 'producto', label: 'Producto', render: (row) => productoMap[row.producto] ?? row.producto },
    { key: 'insumo', label: 'Insumo', render: (row) => insumoMap[row.insumo] ?? row.insumo },
    { key: 'cantidad', label: 'Cantidad', render: (row) => Number(row.cantidad) },
    { key: 'unidad_medida', label: 'Unidad', render: (row) => unidadMap[row.unidad_medida] ?? row.unidad_medida },
  ]

  const fields = [
    {
      key: 'producto',
      label: 'Producto',
      type: 'select',
      required: true,
      options: productos.map((p) => ({ value: p.id, label: p.nombre })),
    },
    {
      key: 'insumo',
      label: 'Insumo Requerido',
      type: 'select',
      required: true,
      options: insumos.map((i) => ({ value: i.id, label: i.nombre })),
    },
    { key: 'cantidad', label: 'Cantidad', type: 'number', required: true },
    {
      key: 'unidad_medida',
      label: 'Unidad de Medida',
      type: 'select',
      required: true,
      options: unidades.map((u) => ({ value: u.id, label: u.nombre })),
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
        alert('No se pudo guardar: Restricción única.')
      } else {
        alert(`No se pudo guardar: ${err.message}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (row) => {
    if (!confirm(`¿Eliminar este ingrediente de la receta?`)) return
    try {
      await deleteRow(row[ID_COLUMN], ID_COLUMN)
    } catch (err) {
      if (err.message?.includes('violates foreign key constraint')) {
        alert('No se puede eliminar porque este valor ya está siendo usado.')
      } else {
        alert(`No se pudo eliminar: ${err.message}`)
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-tomato-400">Inventario · Módulo</p>
          <h1 className="font-display text-3xl text-semolina-100">Recetas</h1>
        </div>
        <Button onClick={() => { setEditingRow(null); setOpen(true) }}>+ Nuevo registro</Button>
      </div>

      <div className="mb-6 rounded-xl border border-oven-700 bg-oven-900/50 p-5 shadow-sm backdrop-blur-sm transition-all">
        <div className="mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-tomato-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h2 className="font-display text-lg text-semolina-200">Buscador Cliente</h2>
        </div>
        
        <div className="flex w-full items-center gap-3 rounded-lg bg-oven-950/50 p-2 border border-oven-800 focus-within:border-tomato-500 focus-within:ring-1 focus-within:ring-tomato-500">
          <input 
            type="text" 
            placeholder="Buscar receta por nombre de producto o insumo..."
            className="w-full bg-transparent px-3 py-1.5 text-sm text-semolina-100 focus:outline-none placeholder-semolina-500/50"
            value={textFilter}
            onChange={(e) => setTextFilter(e.target.value)}
          />
        </div>
      </div>

      <CrudTable
        columns={columns}
        rows={filteredRecetas}
        loading={loading}
        error={error}
        onEdit={(r) => { setEditingRow(r); setOpen(true) }}
        onDelete={handleDelete}
        emptyMessage="Todavía no hay recetas registradas."
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        subtitle={editingRow ? `Receta #${editingRow[ID_COLUMN]}` : 'Nuevo componente de receta'}
        title={editingRow ? 'Editar receta' : 'Añadir a receta'}
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
