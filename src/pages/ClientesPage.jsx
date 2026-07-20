import { useMemo, useState, useEffect } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import CrudTable from '../components/CrudTable'
import CrudForm from '../components/CrudForm'
import SlideOver from '../components/ui/SlideOver'
import Button from '../components/ui/Button'

const TABLE = 'cliente'
const ID_COLUMN = 'id'

function cleanValues(values) {
  const out = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = v === '' ? undefined : v
  }
  return out
}

const nombreCompleto = (c) => [c.nombres, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' ')
const formatDireccion = (d) => [d.calle, d.numero, d.distrito].filter(Boolean).join(', ')

const SEARCH_COLUMNS = ['nombres', 'apellido_paterno', 'apellido_materno', 'num_documento']

export default function ClientesPage() {
  const [textFilter, setTextFilter] = useState('')
  const [debouncedFilter, setDebouncedFilter] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilter(textFilter), 300)
    return () => clearTimeout(timer)
  }, [textFilter])

  const {
    rows: clientes,
    loading,
    error,
    insertRow,
    updateRow,
    deleteRow,
  } = useSupabaseTable(TABLE, { 
    orderBy: 'nombres', 
    ascending: true,
    searchColumn: SEARCH_COLUMNS,
    searchValue: debouncedFilter
  })

  const { rows: tiposDocumento } = useSupabaseTable('tipo_documento')
  const { rows: direcciones } = useSupabaseTable('direccion')

  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  


  const tipoDocMap = useMemo(() => Object.fromEntries(tiposDocumento.map((t) => [t.id, t.nombre])), [tiposDocumento])
  const direccionMap = useMemo(() => Object.fromEntries(direcciones.map((d) => [d.id, formatDireccion(d)])), [direcciones])

  const columns = [
    { key: ID_COLUMN, label: '#' },
    { key: 'nombres', label: 'Cliente', render: (row) => nombreCompleto(row) },
    { key: 'tipo_documento', label: 'Doc.', render: (row) => tipoDocMap[row.tipo_documento] ?? row.tipo_documento },
    { key: 'num_documento', label: 'N° Documento' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'email', label: 'Email' },
    { key: 'direccion', label: 'Dirección', render: (row) => direccionMap[row.direccion] ?? row.direccion },
  ]

  const fields = [
    { key: 'nombres', label: 'Nombres', type: 'text', required: true },
    { key: 'apellido_paterno', label: 'Apellido Paterno', type: 'text' },
    { key: 'apellido_materno', label: 'Apellido Materno', type: 'text' },
    {
      key: 'tipo_documento',
      label: 'Tipo de Documento',
      type: 'select',
      required: true,
      options: tiposDocumento.map((t) => ({ value: t.id, label: t.nombre })),
    },
    { key: 'num_documento', label: 'N° Documento', type: 'text' },
    { key: 'telefono', label: 'Teléfono', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    {
      key: 'direccion',
      label: 'Dirección',
      type: 'searchable-select',
      options: direcciones.map((d) => ({ value: d.id, label: formatDireccion(d) || `Dir #${d.id}` })),
    },
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
        alert('No se pudo guardar: Ya existe un cliente registrado con ese número de documento.')
      } else {
        alert(`No se pudo guardar: ${err.message}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (row) => {
    if (!confirm(`¿Eliminar el cliente ${nombreCompleto(row)}? Esta acción no se puede deshacer.`)) return
    try {
      await deleteRow(row[ID_COLUMN], ID_COLUMN)
    } catch (err) {
      if (err.message?.includes('violates foreign key constraint')) {
        alert('No se puede eliminar porque este cliente tiene pedidos o ventas registradas.')
      } else {
        alert(`No se pudo eliminar: ${err.message}`)
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-tomato-400">Directorio · Módulo</p>
          <h1 className="font-display text-3xl text-semolina-100">Clientes</h1>
        </div>
        <Button onClick={openCreate}>+ Nuevo cliente</Button>
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
              placeholder="Buscar por DNI, Nombres o Apellidos..."
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
        rows={clientes}
        loading={loading}
        error={error}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyMessage="Todavía no hay clientes registrados."
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        subtitle={editingRow ? `Cliente #${editingRow[ID_COLUMN]}` : 'Nuevo cliente'}
        title={editingRow ? 'Editar cliente' : 'Registrar cliente'}
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
