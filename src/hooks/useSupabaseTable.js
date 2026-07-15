import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Hook genérico de CRUD para cualquier tabla de Supabase.
 *
 * @param {string} table - nombre de la tabla en Supabase
 * @param {object} options
 * @param {string} options.select - string de select (para traer relaciones, ej: '*, cliente(nombre)')
 * @param {string} options.orderBy - columna por la que ordenar
 * @param {boolean} options.ascending - orden ascendente/descendente
 */
export function useSupabaseTable(table, { select = '*', orderBy, ascending = false, searchColumn, searchValue, dateFilter } = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    let query = supabase.from(table).select(select).limit(1000)
    if (searchColumn && searchValue) {
      query = query.ilike(searchColumn, `%${searchValue}%`)
    }
    
    if (dateFilter && dateFilter.column) {
      if (dateFilter.start) {
        const startStr = new Date(`${dateFilter.start}T00:00:00`).toISOString()
        query = query.gte(dateFilter.column, startStr)
      }
      if (dateFilter.end) {
        const endStr = new Date(`${dateFilter.end}T23:59:59.999`).toISOString()
        query = query.lte(dateFilter.column, endStr)
      }
    }
    
    if (orderBy) query = query.order(orderBy, { ascending })

    const { data, error } = await query
    if (error) {
      setError(error)
    } else {
      setRows(data ?? [])
    }
    setLoading(false)
  }, [table, select, orderBy, ascending, searchColumn, searchValue, dateFilter?.column, dateFilter?.start, dateFilter?.end])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  const insertRow = useCallback(async (values) => {
    const { data, error } = await supabase.from(table).insert(values).select()
    if (error) throw error
    await fetchRows()
    return data
  }, [table, fetchRows])

  const updateRow = useCallback(async (id, idColumn, values) => {
    const { data, error } = await supabase.from(table).update(values).eq(idColumn, id).select()
    if (error) throw error
    await fetchRows()
    return data
  }, [table, fetchRows])

  const deleteRow = useCallback(async (id, idColumn) => {
    const { error } = await supabase.from(table).delete().eq(idColumn, id)
    if (error) throw error
    await fetchRows()
  }, [table, fetchRows])

  return { rows, loading, error, refetch: fetchRows, insertRow, updateRow, deleteRow }
}
