import { useState } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import CrudTable from '../components/CrudTable'
import CrudForm from '../components/CrudForm'
import SlideOver from '../components/ui/SlideOver'
import Button from '../components/ui/Button'

const LOOKUP_TABLES = [
  { id: 'categoria_producto', name: 'Categorías de Producto' },
  { id: 'unidad_medida', name: 'Unidades de Medida' },
  { id: 'estado_pedido', name: 'Estados de Pedido' },
  { id: 'tipo_documento', name: 'Tipos de Documento' },
  { id: 'canal_origen', name: 'Canales de Origen' },
  { id: 'tipo_comprobante', name: 'Tipos de Comprobante' },
  { id: 'metodo_pago', name: 'Métodos de Pago' },
  { id: 'tipo_empleado', name: 'Roles de Empleado' },
  { id: 'tipo_repartidor', name: 'Tipos de Repartidor' },
]

function LookupCrud({ tableDef }) {
  const { rows, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable(tableDef.id, {
    orderBy: 'id',
    ascending: true,
  })

  const [open, setOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const columns = [
    { key: 'id', label: '#' },
    { key: 'nombre', label: 'Nombre' },
  ]

  const fields = [
    { key: 'nombre', label: 'Nombre / Descripción', type: 'text', required: true },
  ]

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      if (editingRow) {
        await updateRow(editingRow.id, 'id', values)
      } else {
        await insertRow(values)
      }
      setOpen(false)
    } catch (err) {
      if (err.message?.includes('violates unique constraint')) {
        alert('No se pudo guardar: Ya existe un registro con ese nombre.')
      } else {
        alert(`No se pudo guardar: ${err.message}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (row) => {
    if (!confirm(`¿Eliminar "${row.nombre}"?`)) return
    try {
      await deleteRow(row.id, 'id')
    } catch (err) {
      if (err.message?.includes('violates foreign key constraint')) {
        alert('No se puede eliminar porque este valor ya está siendo usado en otros registros del sistema.')
      } else {
        alert(`No se pudo eliminar: ${err.message}`)
      }
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl text-semolina-200">{tableDef.name}</h2>
        <Button onClick={() => { setEditingRow(null); setOpen(true) }}>+ Nuevo</Button>
      </div>
      
      <CrudTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onEdit={(r) => { setEditingRow(r); setOpen(true) }}
        onDelete={handleDelete}
        emptyMessage="No hay registros."
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        subtitle={editingRow ? `Registro #${editingRow.id}` : 'Nuevo registro'}
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

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState(LOOKUP_TABLES[0].id)

  return (
    <div>
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-tomato-400">Sistema · Módulo</p>
        <h1 className="font-display text-3xl text-semolina-100">Configuración</h1>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-oven-700 pb-2">
        {LOOKUP_TABLES.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t-lg px-4 py-2 text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-oven-800 text-tomato-400 border-b-2 border-tomato-500 font-medium'
                : 'text-semolina-400 hover:bg-oven-800/50 hover:text-semolina-200'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {LOOKUP_TABLES.map((tab) => (
        activeTab === tab.id && <LookupCrud key={tab.id} tableDef={tab} />
      ))}
    </div>
  )
}
