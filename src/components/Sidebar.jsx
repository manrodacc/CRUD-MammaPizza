import { NavLink } from 'react-router-dom'

const menus = [
  {
    title: '🔮 Inteligencia Artificial',
    items: [
      { to: '/modelo-predictivo', label: 'Modelo Predictivo' },
    ]
  },
  {
    title: 'Ventas & CRM',
    items: [
      { to: '/pedidos', label: 'Pedidos' },
      { to: '/detalles-pedido', label: 'Detalles Pedido' },
      { to: '/ventas', label: 'Ventas' },
      { to: '/detalles-venta', label: 'Detalles Venta' },
      { to: '/clientes', label: 'Clientes' },
    ]
  },
  {
    title: 'Inventario',
    items: [
      { to: '/productos', label: 'Catálogo' },
      { to: '/insumos', label: 'Insumos' },
      { to: '/recetas', label: 'Recetas' },
    ]
  },
  {
    title: 'Proveedores',
    items: [
      { to: '/proveedores', label: 'Proveedores' },
      { to: '/suministros', label: 'Cat. Suministros' },
    ]
  },
  {
    title: 'Logística',
    items: [
      { to: '/delivery', label: 'Delivery' },
      { to: '/repartidores', label: 'Repartidores' },
      { to: '/sedes', label: 'Sedes' },
      { to: '/direcciones', label: 'Direcciones' },
    ]
  },
  {
    title: 'Contabilidad',
    items: [
      { to: '/pagos', label: 'Pagos' },
      { to: '/metodos-pago', label: 'Desglose Pago' },
    ]
  },
  {
    title: 'Administración',
    items: [
      { to: '/personal', label: 'Personal' },
      { to: '/config', label: 'Configuración' },
    ]
  }
]

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-oven-700 bg-oven-900 px-5 py-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
      <div className="mb-8 shrink-0">
        <p className="font-mono text-xs uppercase tracking-widest text-tomato-400">Pizzería</p>
        <h1 className="font-display text-2xl text-semolina-100">Mamma Pizza</h1>
      </div>

      <nav className="flex flex-col gap-6">
        {menus.map((section, idx) => (
          <div key={idx}>
            <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-semolina-500/70">
              {section.title}
            </h3>
            <div className="flex flex-col gap-1">
              {section.items.map((m) => (
                <NavLink
                  key={m.to}
                  to={m.to}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-tomato-500/15 text-tomato-300 font-medium'
                        : 'text-semolina-300 hover:bg-oven-700 hover:text-semolina-100'
                    }`
                  }
                >
                  {m.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
