import { useMemo, useState, useEffect } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import CrudTable from '../components/CrudTable'
import CrudForm from '../components/CrudForm'
import SlideOver from '../components/ui/SlideOver'
import Button from '../components/ui/Button'

const TABLE = 'producto'
const ID_COLUMN = 'id'

function cleanValues(values) {
  const out = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = v === '' ? undefined : v
  }
  return out
}

export default function ProductosPage() {
  const [textFilter, setTextFilter] = useState('')
  const [debouncedText, setDebouncedText] = useState('')
  const [catFilter, setCatFilter] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedText(textFilter), 400)
    return () => clearTimeout(t)
  }, [textFilter])

  const {
    rows: productos,
    loading,
    error,
    insertRow,
    updateRow,
    deleteRow,
  } = useSupabaseTable(TABLE, { 
    orderBy: 'nombre', 
    ascending: true,
    searchColumn: debouncedText ? 'nombre' : undefined,
    searchValue: debouncedText || undefined
  })

  const { rows: categorias } = useSupabaseTable('categoria_producto')

  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const filteredProductos = useMemo(() => {
    if (!productos) return []
    let result = productos
    if (catFilter) {
      result = result.filter(p => String(p.categoria) === String(catFilter))
    }
    // El texto ya se filtra en el servidor (Supabase), no necesitamos hacerlo aquí.
    return result
  }, [productos, catFilter])

  const categoriaMap = useMemo(() => Object.fromEntries(categorias.map((c) => [c.id, c.nombre])), [categorias])

  const columns = [
    { key: ID_COLUMN, label: '#' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'categoria', label: 'Categoría', render: (row) => categoriaMap[row.categoria] ?? row.categoria },
    { key: 'precio_venta', label: 'Precio (S/)', render: (row) => `S/ ${Number(row.precio_venta).toFixed(2)}` },
    { key: 'stock', label: 'Stock' },
  ]

  const fields = [
    { key: 'nombre', label: 'Nombre del Producto', type: 'text', required: true },
    {
      key: 'categoria',
      label: 'Categoría',
      type: 'select',
      required: true,
      options: categorias.map((c) => ({ value: c.id, label: c.nombre })),
    },
    { key: 'precio_venta', label: 'Precio de Venta', type: 'number', required: true },
    { key: 'stock', label: 'Stock Actual', type: 'number', required: true },
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
      delete values[ID_COLUMN]
      if (editingRow) {
        await updateRow(editingRow[ID_COLUMN], ID_COLUMN, values)
      } else {
        await insertRow(values)
      }
      setOpen(false)
    } catch (err) {
      if (err.message?.includes('violates unique constraint')) {
        alert('No se pudo guardar: Ya existe un producto registrado con ese mismo nombre.')
      } else {
        alert(`No se pudo guardar: ${err.message}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (row) => {
    if (!confirm(`¿Eliminar el producto "${row.nombre}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteRow(row[ID_COLUMN], ID_COLUMN)
    } catch (err) {
      if (err.message?.includes('violates foreign key constraint')) {
        alert('No se puede eliminar porque este producto ya está siendo usado en pedidos, ventas o recetas.')
      } else {
        alert(`No se pudo eliminar: ${err.message}`)
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-tomato-400">Catálogo · Módulo</p>
          <h1 className="font-display text-3xl text-semolina-100">Productos</h1>
        </div>
        <Button onClick={openCreate}>+ Nuevo producto</Button>
      </div>

      <div className="mb-6 rounded-xl border border-oven-700 bg-oven-900/50 p-5 shadow-sm backdrop-blur-sm transition-all">
        <div className="mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-tomato-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h2 className="font-display text-lg text-semolina-200">Filtros Inteligentes</h2>
        </div>
        
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex flex-1 items-center gap-3 rounded-lg bg-oven-950/50 p-2 border border-oven-800 focus-within:border-tomato-500 focus-within:ring-1 focus-within:ring-tomato-500">
            <input 
              type="text" 
              placeholder="Buscar por nombre..."
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

          <div className="flex flex-1 items-center gap-3 rounded-lg bg-oven-950/50 p-2 border border-oven-800">
            <select
              className="w-full bg-transparent px-3 py-1.5 text-sm text-semolina-100 focus:outline-none appearance-none"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
            >
              <option value="" className="bg-oven-900 text-semolina-400">Todas las categorías</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id} className="bg-oven-900">{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <CrudTable
        columns={columns}
        rows={filteredProductos}
        loading={loading}
        error={error}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyMessage="Todavía no hay productos registrados."
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        subtitle={editingRow ? `Producto #${editingRow[ID_COLUMN]}` : 'Nuevo producto'}
        title={editingRow ? 'Editar producto' : 'Registrar producto'}
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
