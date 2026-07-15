import { useMemo, useState } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import CrudTable from '../components/CrudTable'
import CrudForm from '../components/CrudForm'
import SlideOver from '../components/ui/SlideOver'
import Button from '../components/ui/Button'

const TABLE = 'pedido'
const ID_COLUMN = 'id'

// datetime-local <-> ISO helpers (para fecha_registro, timestamptz)
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fromLocalInput(local) {
  if (!local) return undefined
  return new Date(local).toISOString()
}

const getLocalYMD = (d) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Convierte '' a undefined para no mandar strings vacíos a columnas bigint/timestamptz
function cleanValues(values) {
  const out = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = v === '' ? undefined : v
  }
  return out
}

const nombreCompleto = (c) => [c.nombres, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' ')

export default function PedidosPage() {
  // Se llama a useSupabaseTable más abajo después de definir appliedDateFilter

  const { rows: clientes } = useSupabaseTable('cliente', { orderBy: 'nombres', ascending: true })
  const { rows: estados } = useSupabaseTable('estado_pedido')
  const { rows: canales } = useSupabaseTable('canal_origen')

  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [dateFilter, setDateFilter] = useState({ start: '', end: '', preset: 'all' })
  const [appliedDateFilter, setAppliedDateFilter] = useState({ start: '', end: '', preset: 'all' })

  const handleDateChange = (field, value) => {
    setDateFilter(prev => ({ ...prev, [field]: value, preset: 'custom' }))
  }

  const handleApplyFilter = () => {
    setAppliedDateFilter(dateFilter)
  }

  const setQuickFilter = (days, presetName) => {
    if (days === null) {
      const newFilter = { start: '', end: '', preset: presetName }
      setDateFilter(newFilter)
      setAppliedDateFilter(newFilter)
      return
    }
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    const newFilter = {
      start: getLocalYMD(start),
      end: getLocalYMD(end),
      preset: presetName
    }
    setDateFilter(newFilter)
    setAppliedDateFilter(newFilter)
  }

  const {
    rows: pedidos,
    loading,
    error,
    insertRow,
    updateRow,
    deleteRow,
  } = useSupabaseTable(TABLE, { 
    orderBy: ID_COLUMN, 
    ascending: false,
    dateFilter: {
      column: 'fecha_registro',
      start: appliedDateFilter.start,
      end: appliedDateFilter.end
    }
  })

  const clienteMap = useMemo(() => Object.fromEntries(clientes.map((c) => [c.id, nombreCompleto(c)])), [clientes])
  const estadoMap = useMemo(() => Object.fromEntries(estados.map((e) => [e.id, e.nombre])), [estados])
  const canalMap = useMemo(() => Object.fromEntries(canales.map((c) => [c.id, c.nombre])), [canales])

  const columns = [
    { key: ID_COLUMN, label: '#' },
    {
      key: 'fecha_registro',
      label: 'Fecha',
      render: (row) => (row.fecha_registro ? new Date(row.fecha_registro).toLocaleString('es-PE') : '—'),
    },
    { key: 'cliente', label: 'Cliente', render: (row) => clienteMap[row.cliente] ?? row.cliente },
    { key: 'canal', label: 'Canal', render: (row) => canalMap[row.canal] ?? row.canal },
    { key: 'estado', label: 'Estado', render: (row) => estadoMap[row.estado] ?? row.estado },
  ]

  const fields = [
    {
      key: 'cliente',
      label: 'Cliente',
      type: 'select',
      required: true,
      options: clientes.map((c) => ({ value: c.id, label: nombreCompleto(c) })),
    },
    {
      key: 'estado',
      label: 'Estado',
      type: 'select',
      required: true,
      options: estados.map((e) => ({ value: e.id, label: e.nombre })),
    },
    {
      key: 'canal',
      label: 'Canal de origen',
      type: 'select',
      required: true,
      options: canales.map((c) => ({ value: c.id, label: c.nombre })),
    },
    {
      key: 'fecha_registro',
      label: 'Fecha y hora de registro',
      type: 'datetime-local',
      hint: 'Si lo dejas vacío en un pedido nuevo, se usa la fecha/hora actual.',
    },
  ]

  const openCreate = () => {
    setEditingRow(null)
    setOpen(true)
  }

  const openEdit = (row) => {
    setEditingRow({ ...row, fecha_registro: toLocalInput(row.fecha_registro) })
    setOpen(true)
  }

  const handleSubmit = async (rawValues) => {
    setSubmitting(true)
    try {
      const values = cleanValues({
        ...rawValues,
        fecha_registro: fromLocalInput(rawValues.fecha_registro),
      })
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
    if (!confirm(`¿Eliminar el pedido #${row[ID_COLUMN]}? Esta acción no se puede deshacer.`)) return
    try {
      await deleteRow(row[ID_COLUMN], ID_COLUMN)
    } catch (err) {
      if (err.message?.includes('violates foreign key constraint')) {
        alert('No se puede eliminar porque este pedido está asociado a una venta, delivery o detalles.')
      } else {
        alert(`No se pudo eliminar: ${err.message}`)
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-tomato-400">Cocina · Módulo</p>
          <h1 className="font-display text-3xl text-semolina-100">Pedidos</h1>
        </div>
        <Button onClick={openCreate}>+ Nuevo pedido</Button>
      </div>

      <div className="mb-6 rounded-xl border border-oven-700 bg-oven-900/50 p-5 shadow-sm backdrop-blur-sm transition-all">
        <div className="mb-4 flex items-center gap-2">
          <svg className="h-5 w-5 text-tomato-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h2 className="font-display text-lg text-semolina-200">Filtros Inteligentes</h2>
        </div>
        
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm text-semolina-400">Rápido:</span>
            <Button 
              variant="ghost" 
              onClick={() => setQuickFilter(null, 'all')} 
              className={dateFilter.preset === 'all' ? 'bg-oven-700 text-semolina-100 ring-1 ring-oven-600' : ''}
            >
              Todos
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setQuickFilter(0, 'today')} 
              className={dateFilter.preset === 'today' ? 'bg-oven-700 text-semolina-100 ring-1 ring-oven-600' : ''}
            >
              Hoy
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setQuickFilter(7, 'week')} 
              className={dateFilter.preset === 'week' ? 'bg-oven-700 text-semolina-100 ring-1 ring-oven-600' : ''}
            >
              Últimos 7 días
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setQuickFilter(30, 'month')} 
              className={dateFilter.preset === 'month' ? 'bg-oven-700 text-semolina-100 ring-1 ring-oven-600' : ''}
            >
              Últimos 30 días
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-oven-950/50 p-2 border border-oven-800">
            <span className="text-sm text-semolina-400 pl-2">Rango personalizado:</span>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                className="cursor-pointer rounded-md border border-oven-600 bg-oven-800 px-3 py-1.5 text-sm text-semolina-100 focus:border-tomato-500 focus:outline-none focus:ring-1 focus:ring-tomato-500"
                value={dateFilter.start}
                onChange={(e) => handleDateChange('start', e.target.value)}
              />
              <span className="text-semolina-500">-</span>
              <input 
                type="date" 
                className="cursor-pointer rounded-md border border-oven-600 bg-oven-800 px-3 py-1.5 text-sm text-semolina-100 focus:border-tomato-500 focus:outline-none focus:ring-1 focus:ring-tomato-500"
                value={dateFilter.end}
                onChange={(e) => handleDateChange('end', e.target.value)}
              />
              <Button onClick={handleApplyFilter} variant="solid" className="ml-2">
                Filtrar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <CrudTable
        columns={columns}
        rows={pedidos}
        loading={loading}
        error={error}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyMessage="Todavía no hay pedidos registrados."
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        subtitle={editingRow ? `Ticket #${editingRow[ID_COLUMN]}` : 'Nuevo ticket'}
        title={editingRow ? 'Editar pedido' : 'Registrar pedido'}
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
