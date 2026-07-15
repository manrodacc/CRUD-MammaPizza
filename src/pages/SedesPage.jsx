import { useMemo, useState } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import CrudTable from '../components/CrudTable'
import CrudForm from '../components/CrudForm'
import SlideOver from '../components/ui/SlideOver'
import Button from '../components/ui/Button'

const TABLE = 'sede'
const ID_COLUMN = 'id'

function cleanValues(values) {
  const out = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = v === '' ? undefined : v
  }
  return out
}

const formatDireccion = (d) => [d.calle, d.numero, d.distrito].filter(Boolean).join(', ')

export default function SedesPage() {
  const { rows: sedes, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable(TABLE, { 
    orderBy: ID_COLUMN, 
    ascending: true
  })
  const { rows: direcciones } = useSupabaseTable('direccion')

  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [textFilter, setTextFilter] = useState('')

  const direccionMap = useMemo(() => Object.fromEntries(direcciones.map((d) => [d.id, formatDireccion(d)])), [direcciones])

  const filteredData = useMemo(() => {
    if (!sedes) return []
    if (!textFilter.trim()) return sedes
    const lower = textFilter.toLowerCase()
    return sedes.filter(r => (r.nombre || '').toLowerCase().includes(lower))
  }, [sedes, textFilter])

  const columns = [
    { key: ID_COLUMN, label: '#' },
    { key: 'nombre', label: 'Nombre de la Sede' },
    { key: 'direccion', label: 'Dirección', render: (row) => direccionMap[row.direccion] ?? row.direccion },
  ]

  const fields = [
    { key: 'nombre', label: 'Nombre de Sede', type: 'text', required: true },
    {
      key: 'direccion',
      label: 'Dirección (seleccione una existente)',
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
        alert('No se pudo guardar: Ya existe una sede con ese nombre.')
      } else {
        alert(`No se pudo guardar: ${err.message}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (row) => {
    if (!confirm(`¿Eliminar la sede ${row.nombre}?`)) return
    try {
      await deleteRow(row[ID_COLUMN], ID_COLUMN)
    } catch (err) {
      if (err.message?.includes('violates foreign key constraint')) {
        alert('No se puede eliminar porque hay ventas registradas en esta sede.')
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
          <h1 className="font-display text-3xl text-semolina-100">Sucursales / Sedes</h1>
        </div>
        <Button onClick={() => { setEditingRow(null); setOpen(true) }}>+ Nueva sucursal</Button>
      </div>

      <div className="mb-6 rounded-xl border border-oven-700 bg-oven-900/50 p-5 shadow-sm backdrop-blur-sm transition-all">
        <div className="flex w-full items-center gap-3 rounded-lg bg-oven-950/50 p-2 border border-oven-800 focus-within:border-tomato-500 focus-within:ring-1 focus-within:ring-tomato-500">
          <input 
            type="text" 
            placeholder="Buscar por nombre de sede..."
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
        emptyMessage="No hay sucursales registradas."
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        subtitle={editingRow ? `Sede #${editingRow[ID_COLUMN]}` : 'Nueva sede'}
        title={editingRow ? 'Editar' : 'Registrar Sede'}
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
