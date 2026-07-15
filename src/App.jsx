import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import PedidosPage from './pages/PedidosPage'
import VentasPage from './pages/VentasPage'
import ClientesPage from './pages/ClientesPage'
import ProductosPage from './pages/ProductosPage'
import PersonalPage from './pages/PersonalPage'
import DeliveryPage from './pages/DeliveryPage'

// New pages
import ConfiguracionPage from './pages/ConfiguracionPage'
import InsumosPage from './pages/InsumosPage'
import RecetasPage from './pages/RecetasPage'
import ProveedoresPage from './pages/ProveedoresPage'
import ProveedorInsumoPage from './pages/ProveedorInsumoPage'
import DireccionesPage from './pages/DireccionesPage'
import SedesPage from './pages/SedesPage'
import RepartidoresPage from './pages/RepartidoresPage'
import PagosPage from './pages/PagosPage'
import MetodoPagoPagoPage from './pages/MetodoPagoPagoPage'
import DetallePedidoPage from './pages/DetallePedidoPage'
import DetalleVentaPage from './pages/DetalleVentaPage'
import ModeloPredictivoPage from './pages/ModeloPredictivoPage'

function App() {
  return (
    <HashRouter>
      <div className="flex">
        <Sidebar />
        <main className="min-h-screen flex-1 bg-oven-950 px-8 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/pedidos" replace />} />
            
            {/* Core */}
            <Route path="/pedidos" element={<PedidosPage />} />
            <Route path="/ventas" element={<VentasPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/personal" element={<PersonalPage />} />
            <Route path="/delivery" element={<DeliveryPage />} />

            {/* Config & Lookup */}
            <Route path="/config" element={<ConfiguracionPage />} />

            {/* Inventory & Recipes */}
            <Route path="/insumos" element={<InsumosPage />} />
            <Route path="/recetas" element={<RecetasPage />} />

            {/* Suppliers */}
            <Route path="/proveedores" element={<ProveedoresPage />} />
            <Route path="/suministros" element={<ProveedorInsumoPage />} />

            {/* Operations & Logistics */}
            <Route path="/direcciones" element={<DireccionesPage />} />
            <Route path="/sedes" element={<SedesPage />} />
            <Route path="/repartidores" element={<RepartidoresPage />} />

            {/* Accounting */}
            <Route path="/pagos" element={<PagosPage />} />
            <Route path="/metodos-pago" element={<MetodoPagoPagoPage />} />

            {/* Details */}
            <Route path="/detalles-pedido" element={<DetallePedidoPage />} />
            <Route path="/detalles-venta" element={<DetalleVentaPage />} />

            {/* Predictive Model */}
            <Route path="/modelo-predictivo" element={<ModeloPredictivoPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}

export default App
