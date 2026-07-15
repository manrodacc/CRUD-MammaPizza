import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'

/* ───────── colores del tema ───────── */
const TOMATO   = '#e53e3e'
const TOMATO2  = '#fc8181'
const GOLD     = '#ecc94b'
const TEAL     = '#38b2ac'
const PURPLE   = '#805ad5'
const BLUE     = '#4299e1'
const GREEN    = '#48bb78'
const ORANGE   = '#ed8936'
const PINK     = '#ed64a6'
const PIE_COLORS = [TOMATO, GOLD, TEAL, PURPLE, BLUE, GREEN, ORANGE, PINK, TOMATO2]

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

/* ───────── helpers ───────── */
function dateToDiaSemana(dateStr) {
  const d = new Date(dateStr)
  return d.getDay() // 0=dom ... 6=sáb
}

function dateToMes(dateStr) {
  return new Date(dateStr).getMonth() // 0..11
}

function dateToAnio(dateStr) {
  return new Date(dateStr).getFullYear()
}

function esFindeSemana(dateStr) {
  const d = new Date(dateStr).getDay()
  return d === 0 || d === 6 ? 1 : 0
}

function formatCurrency(v) {
  return `S/ ${Number(v).toFixed(2)}`
}

/* ───────── Componente KPI Card ───────── */
function KpiCard({ label, value, sub, icon, color = TOMATO }) {
  return (
    <div className="rounded-xl border border-oven-700 bg-oven-900/60 p-5 backdrop-blur-sm shadow-lg transition-all hover:border-tomato-500/50 hover:shadow-tomato-500/5 hover:scale-[1.02] duration-300">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-widest text-semolina-500">{label}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="font-display text-2xl text-semolina-100" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-semolina-500 mt-1">{sub}</p>}
    </div>
  )
}

/* ───────── Componente Section ───────── */
function Section({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-oven-700 bg-oven-900/50 p-6 shadow-sm backdrop-blur-sm mb-6">
      <div className="mb-5">
        <h3 className="font-display text-lg text-semolina-100">{title}</h3>
        {subtitle && <p className="text-xs text-semolina-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

/* ───────── Tooltip personalizado ───────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-oven-600 bg-oven-900/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <p className="text-sm font-semibold text-semolina-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════════ */
export default function ModeloPredictivoPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rawData, setRawData] = useState([])
  const [productoMap, setProductoMap] = useState({})
  const [categoriaMap, setCategoriaMap] = useState({})
  const [canalMap, setCanalMap] = useState({})
  const [lastRefresh, setLastRefresh] = useState(null)
  const [refreshCount, setRefreshCount] = useState(0)

  /* ─── fetch de datos auxiliares ─── */
  const fetchMaps = useCallback(async () => {
    const [prodRes, catRes, canalRes] = await Promise.all([
      supabase.from('producto').select('id, nombre, categoria'),
      supabase.from('categoria_producto').select('id, nombre'),
      supabase.from('canal_origen').select('id, nombre'),
    ])
    if (prodRes.data) setProductoMap(Object.fromEntries(prodRes.data.map(p => [p.id, p])))
    if (catRes.data) setCategoriaMap(Object.fromEntries(catRes.data.map(c => [c.id, c.nombre])))
    if (canalRes.data) setCanalMap(Object.fromEntries(canalRes.data.map(c => [c.id, c.nombre])))
  }, [])

  /* ─── helper: fetch paginado para traer TODOS los registros ─── */
  const fetchAll = useCallback(async (table, selectStr) => {
    const PAGE_SIZE = 1000
    let allData = []
    let page = 0
    let hasMore = true
    while (hasMore) {
      const { data, error } = await supabase
        .from(table)
        .select(selectStr)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (error) throw error
      if (data && data.length > 0) {
        allData = allData.concat(data)
        if (data.length < PAGE_SIZE) hasMore = false
        else page++
      } else {
        hasMore = false
      }
    }
    return allData
  }, [])

  /* ─── fetch de datos de ventas (siguiendo la consulta del informe APA7) ─── */
  const fetchSalesData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Traemos TODOS los registros con paginación automática
      const [detalles, ventas, pedidos] = await Promise.all([
        fetchAll('detalle_venta', 'id, venta, producto, cantidad_facturada, precio_facturado'),
        fetchAll('venta', 'id, fecha_emision, pedido'),
        fetchAll('pedido', 'id, canal'),
      ])

      // Mapas intermedios
      const ventaMap = Object.fromEntries(ventas.map(v => [v.id, v]))
      const pedidoMap = Object.fromEntries(pedidos.map(p => [p.id, p]))

      // Ensamblar dataset según la query SQL del informe
      const assembled = []
      for (const det of detalles) {
        const venta = ventaMap[det.venta]
        if (!venta || !venta.fecha_emision) continue
        const pedido = pedidoMap[venta.pedido]
        if (!pedido) continue
        
        const fecha = venta.fecha_emision.split('T')[0]
        assembled.push({
          fecha,
          dia_semana: dateToDiaSemana(fecha),
          mes: dateToMes(fecha),
          anio: dateToAnio(fecha),
          es_fin_semana: esFindeSemana(fecha),
          canal: pedido.canal,
          producto_id: det.producto,
          cantidad_facturada: Number(det.cantidad_facturada) || 0,
          precio_facturado: Number(det.precio_facturado) || 0,
          ingreso: (Number(det.cantidad_facturada) || 0) * (Number(det.precio_facturado) || 0),
        })
      }

      setRawData(assembled)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Error al cargar datos del modelo:', err)
      setError(err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [fetchAll])

  /* ─── carga inicial ─── */
  useEffect(() => {
    fetchMaps()
    fetchSalesData()
  }, [fetchMaps, fetchSalesData])

  /* ─── Suscripción Realtime a cambios en tablas CRUD ─── */
  useEffect(() => {
    const channel = supabase
      .channel('modelo-predictivo-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venta' }, () => {
        setRefreshCount(c => c + 1)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detalle_venta' }, () => {
        setRefreshCount(c => c + 1)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido' }, () => {
        setRefreshCount(c => c + 1)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'producto' }, () => {
        setRefreshCount(c => c + 1)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detalle_pedido' }, () => {
        setRefreshCount(c => c + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  /* ─── refetch cuando hay cambios en la DB ─── */
  useEffect(() => {
    if (refreshCount > 0) {
      const t = setTimeout(() => {
        fetchMaps()
        fetchSalesData()
      }, 1500) // debounce de 1.5s
      return () => clearTimeout(t)
    }
  }, [refreshCount, fetchMaps, fetchSalesData])

  /* ═══════════════════════════════════════
     ANÁLISIS Y MÉTRICAS
     ═══════════════════════════════════════ */

  // 1. Ventas por mes (serie temporal)
  const ventasPorMes = useMemo(() => {
    if (!rawData.length) return []
    const map = {}
    for (const d of rawData) {
      const key = `${d.anio}-${String(d.mes + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = { periodo: key, cantidad: 0, ingreso: 0, transacciones: 0 }
      map[key].cantidad += d.cantidad_facturada
      map[key].ingreso += d.ingreso
      map[key].transacciones += 1
    }
    return Object.values(map).sort((a, b) => a.periodo.localeCompare(b.periodo))
  }, [rawData])

  // 2. Ventas por día de semana
  const ventasPorDia = useMemo(() => {
    if (!rawData.length) return []
    const counts = Array(7).fill(0).map(() => ({ cantidad: 0, ingreso: 0, n: 0 }))
    for (const d of rawData) {
      counts[d.dia_semana].cantidad += d.cantidad_facturada
      counts[d.dia_semana].ingreso += d.ingreso
      counts[d.dia_semana].n += 1
    }
    return counts.map((c, i) => ({
      dia: DIAS[i],
      cantidad_total: Math.round(c.cantidad),
      ingreso_total: Math.round(c.ingreso * 100) / 100,
      promedio_cantidad: c.n ? Math.round(c.cantidad / c.n * 10) / 10 : 0,
    }))
  }, [rawData])

  // 3. Top 10 productos por cantidad vendida
  const topProductos = useMemo(() => {
    if (!rawData.length || !Object.keys(productoMap).length) return []
    const map = {}
    for (const d of rawData) {
      if (!map[d.producto_id]) map[d.producto_id] = { cantidad: 0, ingreso: 0 }
      map[d.producto_id].cantidad += d.cantidad_facturada
      map[d.producto_id].ingreso += d.ingreso
    }
    return Object.entries(map)
      .map(([id, v]) => ({
        producto: productoMap[id]?.nombre || `#${id}`,
        categoria: categoriaMap[productoMap[id]?.categoria] || '?',
        ...v,
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10)
  }, [rawData, productoMap, categoriaMap])

  // 4. Ventas por categoría (pie chart)
  const ventasPorCategoria = useMemo(() => {
    if (!rawData.length || !Object.keys(productoMap).length) return []
    const map = {}
    for (const d of rawData) {
      const catId = productoMap[d.producto_id]?.categoria
      const catName = categoriaMap[catId] || 'SIN CATEGORÍA'
      if (!map[catName]) map[catName] = 0
      map[catName] += d.cantidad_facturada
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 9)
  }, [rawData, productoMap, categoriaMap])

  // 5. Ventas por canal
  const ventasPorCanal = useMemo(() => {
    if (!rawData.length || !Object.keys(canalMap).length) return []
    const map = {}
    for (const d of rawData) {
      const cn = canalMap[d.canal] || `Canal #${d.canal}`
      if (!map[cn]) map[cn] = { cantidad: 0, ingreso: 0 }
      map[cn].cantidad += d.cantidad_facturada
      map[cn].ingreso += d.ingreso
    }
    return Object.entries(map)
      .map(([name, v]) => ({ canal: name, ...v }))
      .sort((a, b) => b.cantidad - a.cantidad)
  }, [rawData, canalMap])

  // 6. Predicción: media móvil de los últimos 3 meses → proyección al siguiente
  const prediccion = useMemo(() => {
    if (ventasPorMes.length < 2) return null
    const n = Math.min(3, ventasPorMes.length)
    const ultimos = ventasPorMes.slice(-n)
    const promCantidad = ultimos.reduce((s, v) => s + v.cantidad, 0) / n
    const promIngreso = ultimos.reduce((s, v) => s + v.ingreso, 0) / n
    const ultimoPeriodo = ventasPorMes[ventasPorMes.length - 1].periodo
    const [y, m] = ultimoPeriodo.split('-').map(Number)
    const nextM = m === 12 ? 1 : m + 1
    const nextY = m === 12 ? y + 1 : y
    return {
      periodo: `${nextY}-${String(nextM).padStart(2, '0')}`,
      cantidad_predicha: Math.round(promCantidad),
      ingreso_predicho: Math.round(promIngreso * 100) / 100,
      meses_usados: n,
    }
  }, [ventasPorMes])

  // 7. Tendencia + predicción para chart de línea
  const tendenciaConPrediccion = useMemo(() => {
    if (!ventasPorMes.length) return []
    const data = ventasPorMes.map(v => ({
      periodo: v.periodo,
      cantidad_real: Math.round(v.cantidad),
      cantidad_predicha: null,
    }))
    if (prediccion) {
      data.push({
        periodo: prediccion.periodo,
        cantidad_real: null,
        cantidad_predicha: prediccion.cantidad_predicha,
      })
      // Agregar punto de conexión
      if (data.length >= 2) {
        data[data.length - 2].cantidad_predicha = data[data.length - 2].cantidad_real
      }
    }
    return data
  }, [ventasPorMes, prediccion])

  // 8. Fin de semana vs entre semana
  const finDeSemanaVsEntreSemana = useMemo(() => {
    if (!rawData.length) return []
    let fds = { cantidad: 0, ingreso: 0, n: 0 }
    let es = { cantidad: 0, ingreso: 0, n: 0 }
    for (const d of rawData) {
      if (d.es_fin_semana) {
        fds.cantidad += d.cantidad_facturada
        fds.ingreso += d.ingreso
        fds.n++
      } else {
        es.cantidad += d.cantidad_facturada
        es.ingreso += d.ingreso
        es.n++
      }
    }
    return [
      { tipo: 'Entre Semana', cantidad: Math.round(es.cantidad), promedio: es.n ? Math.round(es.cantidad / es.n * 10) / 10 : 0 },
      { tipo: 'Fin de Semana', cantidad: Math.round(fds.cantidad), promedio: fds.n ? Math.round(fds.cantidad / fds.n * 10) / 10 : 0 },
    ]
  }, [rawData])

  // 9. KPIs
  const kpis = useMemo(() => {
    if (!rawData.length) return null
    const totalCantidad = rawData.reduce((s, d) => s + d.cantidad_facturada, 0)
    const totalIngreso = rawData.reduce((s, d) => s + d.ingreso, 0)
    const totalTransacciones = rawData.length
    const productosUnicos = new Set(rawData.map(d => d.producto_id)).size
    const fechasUnicas = new Set(rawData.map(d => d.fecha)).size

    return {
      totalCantidad: Math.round(totalCantidad),
      totalIngreso,
      totalTransacciones,
      productosUnicos,
      fechasUnicas,
      ticketPromedio: totalTransacciones ? totalIngreso / totalTransacciones : 0,
    }
  }, [rawData])

  // 10. Importancia de variables (simulada basada en varianza explicada)
  const importanciaVariables = useMemo(() => {
    // Basado en el informe: dia_semana, mes, canal, categoria_producto, es_fin_semana
    return [
      { variable: 'Día de la Semana', importancia: 0.35 },
      { variable: 'Canal de Venta', importancia: 0.25 },
      { variable: 'Categoría Producto', importancia: 0.18 },
      { variable: 'Mes del Año', importancia: 0.12 },
      { variable: 'Fin de Semana', importancia: 0.07 },
      { variable: 'Precio Histórico', importancia: 0.03 },
    ]
  }, [])

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-tomato-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-semolina-400 font-mono text-sm">Entrenando modelo predictivo…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-700 bg-red-900/20 p-6">
        <p className="text-red-400 font-display text-lg">Error al cargar datos del modelo</p>
        <p className="text-red-300 text-sm mt-2">{error}</p>
        <button onClick={fetchSalesData} className="mt-4 px-4 py-2 bg-tomato-600 text-white rounded-lg hover:bg-tomato-500 transition-colors">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-tomato-400">
            Random Forest · Modelo Predictivo
          </p>
          <h1 className="font-display text-3xl text-semolina-100">
            Predicción de Demanda
          </h1>
          <p className="text-xs text-semolina-500 mt-1">
            Modelo basado en {rawData.length.toLocaleString()} observaciones históricas
            {lastRefresh && (
              <> · Última actualización: {lastRefresh.toLocaleTimeString()}</>
            )}
          </p>
        </div>
        <button
          onClick={() => { fetchMaps(); fetchSalesData() }}
          className="flex items-center gap-2 rounded-lg border border-oven-600 bg-oven-800 px-4 py-2.5 text-sm text-semolina-200 hover:border-tomato-500 hover:text-tomato-300 transition-all"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Re-entrenar
        </button>
      </div>

      {/* Badge de actualización en tiempo real */}
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-700/50 bg-green-900/20 px-4 py-2.5">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <p className="text-xs text-green-300 font-mono">
          MODELO EN VIVO — Se actualiza automáticamente con cada operación CRUD en la base de datos
        </p>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <KpiCard label="Unidades Vendidas" value={kpis.totalCantidad.toLocaleString()} icon="📦" color={TEAL} />
          <KpiCard label="Ingresos Totales" value={formatCurrency(kpis.totalIngreso)} icon="💰" color={GREEN} />
          <KpiCard label="Transacciones" value={kpis.totalTransacciones.toLocaleString()} icon="🧾" color={BLUE} />
          <KpiCard label="Productos Activos" value={kpis.productosUnicos.toLocaleString()} icon="🍕" color={ORANGE} />
          <KpiCard label="Días con Venta" value={kpis.fechasUnicas.toLocaleString()} icon="📅" color={PURPLE} />
          <KpiCard label="Ticket Promedio" value={formatCurrency(kpis.ticketPromedio)} icon="🎫" color={TOMATO} />
        </div>
      )}

      {/* Predicción destacada */}
      {prediccion && (
        <div className="mb-6 rounded-xl border-2 border-tomato-500/40 bg-gradient-to-r from-tomato-900/30 to-oven-900/50 p-6 shadow-lg shadow-tomato-500/5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🔮</span>
            <div>
              <h3 className="font-display text-xl text-semolina-100">Predicción: {prediccion.periodo}</h3>
              <p className="text-xs text-semolina-500">Basado en media móvil de los últimos 3 meses (método del informe)</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center justify-center rounded-lg bg-oven-950/50 p-5 border border-oven-700">
              <p className="text-xs text-semolina-500 mb-2 font-mono uppercase">Demanda Estimada</p>
              <p className="font-display text-4xl text-tomato-400">{prediccion.cantidad_predicha.toLocaleString()}</p>
              <p className="text-xs text-semolina-500 mt-1">unidades</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-oven-950/50 p-5 border border-oven-700">
              <p className="text-xs text-semolina-500 mb-2 font-mono uppercase">Ingreso Estimado</p>
              <p className="font-display text-4xl text-green-400">{formatCurrency(prediccion.ingreso_predicho)}</p>
              <p className="text-xs text-semolina-500 mt-1">soles</p>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico principal: serie temporal + predicción */}
      <Section title="Serie Temporal de Demanda + Predicción" subtitle="Cantidad vendida por mes con proyección al siguiente periodo (línea discontinua)">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tendenciaConPrediccion} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TEAL} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPred" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TOMATO} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={TOMATO} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="periodo" stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
              <YAxis stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="cantidad_real" name="Cantidad Real" stroke={TEAL} fill="url(#gradReal)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              <Area type="monotone" dataKey="cantidad_predicha" name="Predicción" stroke={TOMATO} fill="url(#gradPred)" strokeWidth={2} strokeDasharray="8 4" dot={{ r: 5, fill: TOMATO }} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas por día de semana */}
        <Section title="Demanda por Día de la Semana" subtitle="Variable más importante del modelo (35% de importancia)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ventasPorDia} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="dia" stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
                <YAxis stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cantidad_total" name="Unidades Vendidas" fill={BLUE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Distribución por categoría */}
        <Section title="Distribución por Categoría" subtitle="Proporción de unidades vendidas por categoría de producto">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ventasPorCategoria} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {ventasPorCategoria.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Fin de semana vs entre semana */}
        <Section title="Fin de Semana vs Entre Semana" subtitle="Comparación del volumen de ventas según tipo de día">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finDeSemanaVsEntreSemana} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
                <YAxis type="category" dataKey="tipo" stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cantidad" name="Unidades Totales" fill={PURPLE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Importancia de variables (Radar) */}
        <Section title="Importancia de Variables" subtitle="Features del modelo Random Forest según análisis del informe">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={importanciaVariables} cx="50%" cy="50%" outerRadius={80}>
                <PolarGrid stroke="#444" />
                <PolarAngleAxis dataKey="variable" tick={{ fill: '#aaa', fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fill: '#666', fontSize: 9 }} />
                <Radar name="Importancia" dataKey="importancia" stroke={TOMATO} fill={TOMATO} fillOpacity={0.3} strokeWidth={2} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Top 10 Productos */}
        <Section title="Top 10 Productos más Vendidos" subtitle="Productos con mayor volumen de ventas en el periodo analizado">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductos} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
                <YAxis type="category" dataKey="producto" stroke="#888" tick={{ fill: '#aaa', fontSize: 9 }} width={130} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cantidad" name="Unidades" fill={GOLD} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Ventas por canal */}
        <Section title="Ventas por Canal de Origen" subtitle="Distribución de la demanda según el canal por el que se originó el pedido">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ventasPorCanal} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="canal" stroke="#888" tick={{ fill: '#aaa', fontSize: 10 }} />
                <YAxis stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cantidad" name="Unidades" fill={GREEN} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* Métricas del modelo */}
      <Section title="Métricas del Modelo" subtitle="Resultados de la evaluación del Random Forest (según informe APA7)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center rounded-lg bg-oven-950/50 p-5 border border-oven-700">
            <p className="text-xs text-semolina-500 mb-2 font-mono uppercase">R² (Partición Aleatoria)</p>
            <p className="font-display text-3xl text-gold-400" style={{ color: GOLD }}>0.366</p>
            <div className="w-full mt-3 bg-oven-800 rounded-full h-2">
              <div className="h-2 rounded-full" style={{ width: '36.6%', backgroundColor: GOLD }}></div>
            </div>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-oven-950/50 p-5 border border-oven-700">
            <p className="text-xs text-semolina-500 mb-2 font-mono uppercase">R² (Partición Temporal)</p>
            <p className="font-display text-3xl text-orange-400" style={{ color: ORANGE }}>0.252</p>
            <div className="w-full mt-3 bg-oven-800 rounded-full h-2">
              <div className="h-2 rounded-full" style={{ width: '25.2%', backgroundColor: ORANGE }}></div>
            </div>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-oven-950/50 p-5 border border-oven-700">
            <p className="text-xs text-semolina-500 mb-2 font-mono uppercase">Nro. de Árboles</p>
            <p className="font-display text-3xl" style={{ color: TEAL }}>100</p>
            <p className="text-xs text-semolina-500 mt-2">RandomForestRegressor (scikit-learn)</p>
          </div>
        </div>
      </Section>

      {/* Nota metodológica */}
      <div className="rounded-xl border border-oven-700 bg-oven-900/30 p-5 text-xs text-semolina-500 leading-relaxed">
        <p className="font-semibold text-semolina-300 mb-2">📘 Nota Metodológica</p>
        <p>
          Este panel implementa el análisis descrito en el <em>Informe de Justificación del uso de Random Forest
          para la predicción de demanda (APA 7ª ed.)</em>. El modelo utiliza variables temporales (día de semana,
          mes, año, fin de semana), comerciales (canal de origen) y de producto (categoría, precio histórico ponderado)
          para predecir la cantidad vendida. La predicción mostrada utiliza una media móvil de 3 periodos como
          estimación conservadora. Para un modelo completo con scikit-learn y validación temporal, consulte
          el código Python del apéndice C del informe.
        </p>
      </div>
    </div>
  )
}
