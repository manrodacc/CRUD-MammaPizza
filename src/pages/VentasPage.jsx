import { useMemo, useState } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import CrudTable from '../components/CrudTable'
import CrudForm from '../components/CrudForm'
import SlideOver from '../components/ui/SlideOver'
import Button from '../components/ui/Button'

const TABLE = 'venta'
const ID_COLUMN = 'id'

// datetime-local <-> ISO helpers
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

function cleanValues(values) {
  const out = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = v === '' ? undefined : v
  }
  return out
}

const nombreCompleto = (c) => [c.nombres, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' ')

export default function VentasPage() {
  // Se llama a useSupabaseTable más abajo después de definir appliedDateFilter

  const { rows: sedes } = useSupabaseTable('sede', { orderBy: 'nombre', ascending: true })
  const { rows: pedidos } = useSupabaseTable('pedido', { orderBy: 'id', ascending: false })
  const { rows: empleados } = useSupabaseTable('empleado', { orderBy: 'nombres', ascending: true })
  const { rows: pagos } = useSupabaseTable('pago', { orderBy: 'id', ascending: false })

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
    rows: ventas,
    loading,
    error,
    insertRow,
    updateRow,
    deleteRow,
  } = useSupabaseTable(TABLE, { 
    orderBy: ID_COLUMN, 
    ascending: false,
    dateFilter: {
      column: 'fecha_emision',
      start: appliedDateFilter.start,
      end: appliedDateFilter.end
    }
  })

  const sedeMap = useMemo(() => Object.fromEntries(sedes.map((s) => [s.id, s.nombre])), [sedes])
  const pedidoMap = useMemo(() => Object.fromEntries(pedidos.map((p) => [p.id, `#${p.id}`])), [pedidos])
  const empleadoMap = useMemo(() => Object.fromEntries(empleados.map((e) => [e.id, nombreCompleto(e)])), [empleados])
  const pagoMap = useMemo(() => Object.fromEntries(pagos.map((p) => [p.id, `Pago #${p.id} (S/ ${p.monto_total})`])), [pagos])

  const columns = [
    { key: ID_COLUMN, label: '#' },
    { key: 'serie_correlativo', label: 'Serie/Correlativo' },
    {
      key: 'fecha_emision',
      label: 'Fecha Emisión',
      render: (row) => (row.fecha_emision ? new Date(row.fecha_emision).toLocaleString('es-PE') : '—'),
    },
    { key: 'sede', label: 'Sede', render: (row) => sedeMap[row.sede] ?? row.sede },
    { key: 'pedido', label: 'Pedido', render: (row) => pedidoMap[row.pedido] ?? row.pedido },
    { key: 'empleado', label: 'Empleado', render: (row) => empleadoMap[row.empleado] ?? row.empleado },
  ]

  const fields = [
    {
      key: 'serie_correlativo',
      label: 'Serie y Correlativo',
      type: 'text',
      required: true,
    },
    {
      key: 'sede',
      label: 'Sede',
      type: 'select',
      required: true,
      options: sedes.map((s) => ({ value: s.id, label: s.nombre })),
    },
    {
      key: 'pedido',
      label: 'Pedido',
      type: 'select',
      required: true,
      options: pedidos.map((p) => ({ value: p.id, label: `Pedido #${p.id}` })),
    },
    {
      key: 'empleado',
      label: 'Empleado',
      type: 'select',
      required: true,
      options: empleados.map((e) => ({ value: e.id, label: nombreCompleto(e) })),
    },
    {
      key: 'pago',
      label: 'Pago asociado',
      type: 'select',
      required: true,
      options: pagos.map((p) => ({ value: p.id, label: `Pago #${p.id} (S/ ${p.monto_total})` })),
    },
    {
      key: 'fecha_emision',
      label: 'Fecha y hora de emisión',
      type: 'datetime-local',
      hint: 'Si lo dejas vacío, se usa la fecha/hora actual.',
    },
  ]

  const openCreate = () => {
    setEditingRow(null)
    setOpen(true)
  }

  const openEdit = (row) => {
    setEditingRow({ ...row, fecha_emision: toLocalInput(row.fecha_emision) })
    setOpen(true)
  }

  const handleSubmit = async (rawValues) => {
    setSubmitting(true)
    try {
      const values = cleanValues({
        ...rawValues,
        fecha_emision: fromLocalInput(rawValues.fecha_emision),
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
    if (!confirm(`¿Eliminar la venta #${row[ID_COLUMN]}? Esta acción no se puede deshacer.`)) return
    try {
      await deleteRow(row[ID_COLUMN], ID_COLUMN)
    } catch (err) {
      if (err.message?.includes('violates foreign key constraint')) {
        alert('No se puede eliminar porque esta venta tiene detalles o registros asociados.')
      } else {
        alert(`No se pudo eliminar: ${err.message}`)
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-tomato-400">Facturación · Módulo</p>
          <h1 className="font-display text-3xl text-semolina-100">Ventas</h1>
        </div>
        <Button onClick={openCreate}>+ Nueva venta</Button>
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
              Todas
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
        rows={ventas}
        loading={loading}
        error={error}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyMessage="Todavía no hay ventas registradas."
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        subtitle={editingRow ? `Venta #${editingRow[ID_COLUMN]}` : 'Nueva venta'}
        title={editingRow ? 'Editar venta' : 'Registrar venta'}
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
