---
name: pizzeria-db-schema
description: Reference schema for the "Forno" pizzeria Supabase database (project ref lnsrhxgqdepmwecvnglc). Use this any time you need to build, extend, or debug a CRUD against this database — reading table/column names, foreign keys, RLS policies, or the React frontend conventions used in this project. Trigger this whenever the user mentions the pizzeria database, any of the table names listed below (pedido, cliente, producto, venta, etc.), or asks to add a new CRUD module to the "pizzeria-crud" React app. Do NOT guess column names for this database from general knowledge — always check this file first, since table/column names here follow specific conventions that differ from common assumptions (see "Naming conventions" below).
---

# Pizzeria DB Schema (Forno)

Supabase project ref: `lnsrhxgqdepmwecvnglc`
Schema: `public`
Frontend: React + Vite + Tailwind v4, in the `pizzeria-crud` project (see "Frontend conventions" below).

## ⚠️ Naming conventions — read this first

This schema does **not** use `id_tablename` style primary keys or prefixed foreign keys. Getting this wrong is the #1 source of "column does not exist" errors.

- **Primary key is always literally `id`** (bigint, identity), on every table. Never `id_pedido`, `id_cliente`, etc.
- **Foreign key columns are named after the referenced entity, singular, with no prefix.** E.g. `pedido.cliente` (→ `cliente.id`), `pedido.estado` (→ `estado_pedido.id`), `detalle_pedido.producto` (→ `producto.id`). Never `id_cliente`, `cliente_id`, `fk_cliente`.
- Lookup/catalog tables (see below) all have the same shape: `id bigint`, `nombre varchar`. Nothing else.
- `cliente` and `empleado` do **not** have a single `nombre` field — they split into `nombres`, `apellido_paterno`, `apellido_materno`. Build a display name by concatenating these (see Frontend conventions).

## Tables by domain

### Catálogo de productos
| Table | Columns | Notes |
|---|---|---|
| `categoria_producto` | `id`, `nombre` | lookup table |
| `producto` | `id`, `nombre` (unique), `categoria`→categoria_producto.id, `precio_venta` (numeric), `stock` (int) | |
| `unidad_medida` | `id`, `nombre` | lookup table |
| `insumo` | `id`, `nombre` (unique), `unidad_medida`→unidad_medida.id, `stock` (numeric), `fecha_vencimiento` (date, nullable) | |
| `receta` | `id`, `producto`→producto.id, `insumo`→insumo.id, `cantidad` (numeric), `unidad_medida`→unidad_medida.id | receta = qué insumos y cuánto lleva cada producto |

### Proveedores
| Table | Columns | Notes |
|---|---|---|
| `proveedor` | `id`, `ruc` (unique), `razon_social` (text), `telefono`, `email` (nullable), `direccion`→direccion.id | |
| `proveedor_insumo` | `id`, `insumo`→insumo.id, `proveedor`→proveedor.id | tabla puente (qué proveedor provee qué insumo) |

### Clientes y direcciones
| Table | Columns | Notes |
|---|---|---|
| `cliente` | `id`, `nombres`, `apellido_paterno` (nullable), `apellido_materno` (nullable), `telefono` (nullable), `email` (nullable), `num_documento` (unique, nullable), `tipo_documento`→tipo_documento.id, `direccion`→direccion.id | ~61k filas |
| `direccion` | `id`, `departamento`, `provincia`, `distrito`, `urbanizacion`, `calle`, `numero`, `referencia` (text), `ubicacion` (geography, nullable) | usada por cliente, empleado, proveedor, sede |
| `tipo_documento` | `id`, `nombre` | lookup (DNI, RUC, etc.) |
| `canal_origen` | `id`, `nombre` | lookup (web, teléfono, app, etc.) |

### Pedidos
| Table | Columns | Notes |
|---|---|---|
| `pedido` | `id`, `cliente`→cliente.id, `fecha_registro` (timestamptz, default `now()`), `canal`→canal_origen.id, `estado`→estado_pedido.id | ~64k filas. **No tiene columnas `total`, `sede`, `tipo_comprobante` ni `observaciones`** — no las inventes |
| `detalle_pedido` | `id`, `producto`→producto.id, `pedido`→pedido.id, `cantidad_solicitada` (numeric), `precio_unitario_historico` (numeric) | el total de un pedido se calcula sumando `cantidad_solicitada * precio_unitario_historico` de sus detalles, no está precalculado |
| `estado_pedido` | `id`, `nombre` | lookup (ej: pendiente, en preparación, entregado…) |

### Ventas y pagos
| Table | Columns | Notes |
|---|---|---|
| `venta` | `id`, `serie_correlativo` (unique), `fecha_emision` (timestamptz, default `now()`), `sede`→sede.id, `pedido`→pedido.id, `empleado`→empleado.id, `pago`→pago.id | |
| `detalle_venta` | `id`, `venta`→venta.id, `producto`→producto.id, `cantidad_facturada` (numeric), `precio_facturado` (numeric) | |
| `pago` | `id`, `tipo_comprobante`→tipo_comprobante.id, `monto_total` (numeric, default 0.00) | |
| `tipo_comprobante` | `id`, `nombre` | lookup (boleta, factura, etc.) — vive en `pago`, no en `pedido` |
| `metodo_pago` | `id`, `nombre` | lookup (efectivo, tarjeta, yape, etc.) |
| `metodo_pago_pago` | `id`, `metodo_pago`→metodo_pago.id (nullable), `pago`→pago.id (nullable) | tabla puente: un pago puede combinar varios métodos |

### Personal
| Table | Columns | Notes |
|---|---|---|
| `empleado` | `id`, `nombres`, `apellido_paterno`, `apellido_materno`, `num_documento` (unique), `tipo_documento`→tipo_documento.id, `email`, `tipo_empleado`→tipo_empleado.id, `direccion`→direccion.id | solo 6 filas |
| `tipo_empleado` | `id`, `nombre` | lookup |

### Delivery
| Table | Columns | Notes |
|---|---|---|
| `sede` | `id`, `nombre` (unique), `direccion`→direccion.id | solo 1 fila actualmente |
| `repartidor` | `id`, `nombre`, `tipo_repartidor`→tipo_repartidor.id | |
| `tipo_repartidor` | `id`, `nombre` | lookup |
| `delivery` | `id`, `pedido`→pedido.id, `costo_delivery` (numeric), `direccion_entrega` (text), `repartidor`→repartidor.id, `ubicacion_entrega` (geography, nullable) | tabla vacía por ahora |

### Ignorar (sistema PostGIS, no son parte del negocio)
`spatial_ref_sys`, `geography_columns`, `geometry_columns` — no crear CRUD para estas.

## RLS (Row Level Security)

Todas las 26 tablas de negocio tienen RLS **activado**, con dos policies cada una:
- `allow_all_authenticated` — rol `authenticated`, `cmd ALL`, `using (true)`
- `allow_all_anon` — rol `anon`, `cmd ALL`, `using (true) with check (true)`

Esto significa que **no hay login** en este proyecto: el frontend usa la anon key directo y RLS deja pasar todo. Si en el futuro se agrega login/roles diferenciados, esto debe revisarse — ahora mismo cualquiera con la anon key (que ya es pública en el bundle del frontend) puede leer y escribir todas las tablas.

`spatial_ref_sys` tiene RLS deshabilitado (tabla estándar de PostGIS, no es dato del negocio, riesgo bajo, no fue modificada).

## Frontend conventions (`pizzeria-crud` project)

- Cliente Supabase único en `src/lib/supabaseClient.js`, usando `import.meta.env.VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (`.env`, no versionado).
- Hook genérico `src/hooks/useSupabaseTable.js`:
  ```js
  const { rows, loading, error, refetch, insertRow, updateRow, deleteRow } =
    useSupabaseTable('nombre_tabla', { select: '*', orderBy: 'id', ascending: false })
  ```
  `insertRow(values)`, `updateRow(id, 'id', values)`, `deleteRow(id, 'id')` — el segundo argumento siempre es el nombre de la columna PK, que en este schema **siempre es `'id'`**.
- Componentes genéricos, config-driven, en `src/components/`:
  - `CrudTable.jsx` — recibe `columns: [{key, label, render?}]` y `rows`
  - `CrudForm.jsx` — recibe `fields: [{key, label, type, required?, options?}]` (`type` puede ser `text`, `number`, `date`, `datetime-local`, `textarea`, `select`)
- Cada módulo de negocio es una página en `src/pages/<Modulo>Page.jsx` que arma su propio `columns`/`fields` y usa los dos componentes genéricos de arriba — **no crear tablas/formularios desde cero por módulo**, seguir el patrón de `PedidosPage.jsx`.
- Al armar un `select` de FK en un formulario, usar la tabla lookup correspondiente (ver tabla de dominios arriba) y mapear `id → nombre` (o `nombres + apellidos` para cliente/empleado).
- Antes de mandar un `insert`/`update`, limpiar strings vacíos a `undefined` (ver `cleanValues` en `PedidosPage.jsx`) para no romper columnas `bigint`/`timestamptz`.
- Timestamps (`fecha_registro`, `fecha_emision`) son `timestamptz`; el patrón usado es `type: 'datetime-local'` en el form + helpers `toLocalInput`/`fromLocalInput` para convertir ISO ↔ el formato que espera el input.

## Cuando falte información

Si una tabla nueva no está en este documento (poco probable, esta lista está completa a la fecha de creación) o si algo no calza, correr esto en el SQL editor de Supabase y actualizar este archivo:
```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
```
