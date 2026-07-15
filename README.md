# Forno — CRUD Pizzería (React + Tailwind + Supabase)

## Setup

1. `npm install`
2. Copia `.env.example` a `.env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los datos de tu proyecto (Supabase → Project Settings → API).
3. `npm run dev`

## Estado actual

- Módulo **Pedidos**: CRUD completo y funcional (crear, listar, editar, eliminar) contra la tabla `pedido`, con selects relacionados a `cliente`, `estado_pedido`, `canal_origen`, `sede` y `tipo_comprobante`.
- Resto de módulos (Catálogo, Clientes, Ventas, Personal, Delivery): pendientes — se construyen reutilizando `CrudTable` + `CrudForm` con una config nueva por página, siguiendo el mismo patrón que `src/pages/PedidosPage.jsx`.

## ⚠️ Importante: ajustar nombres de columnas

Los nombres de columna en `src/pages/PedidosPage.jsx` (`id_pedido`, `id_cliente`, `fecha_pedido`, etc.) son un placeholder razonable. Verifica los nombres reales de columnas en Supabase y ajusta las constantes `TABLE` / `ID_COLUMN` y los `key` de `columns`/`fields` si difieren.

## Arquitectura

- `src/lib/supabaseClient.js` — cliente único de Supabase
- `src/hooks/useSupabaseTable.js` — hook genérico de CRUD (fetch/insert/update/delete) reutilizable para cualquier tabla
- `src/components/CrudTable.jsx` y `CrudForm.jsx` — tabla y formulario genéricos, configurables por `columns`/`fields`
- `src/pages/*Page.jsx` — una página por módulo, cada una define su propia config y usa los componentes genéricos
