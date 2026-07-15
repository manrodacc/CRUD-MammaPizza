import { useEffect, useState } from 'react'
import Field, { TextInput, TextArea, SelectInput } from './ui/Field'
import Button from './ui/Button'

/**
 * Formulario genérico de CRUD.
 *
 * fields: [{
 *   key, label, type: 'text' | 'number' | 'date' | 'textarea' | 'select',
 *   required?, options?: [{ value, label }]  // para type 'select'
 * }]
 * initialValues: objeto con los valores actuales (edición) o {} (creación)
 * onSubmit(values), onCancel, submitting
 */
export default function CrudForm({ fields, initialValues, onSubmit, onCancel, submitting }) {
  const [values, setValues] = useState(initialValues ?? {})

  useEffect(() => {
    setValues(initialValues ?? {})
  }, [initialValues])

  const setField = (key, value) => setValues((v) => ({ ...v, [key]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col gap-4">
      <div className="flex-1 space-y-4">
        {fields.map((field) => (
          <Field key={field.key} label={field.label} required={field.required} hint={field.hint}>
            {field.type === 'select' ? (
              <SelectInput
                required={field.required}
                value={values[field.key] ?? ''}
                onChange={(e) => setField(field.key, e.target.value)}
              >
                <option value="" disabled>
                  Selecciona…
                </option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </SelectInput>
            ) : field.type === 'textarea' ? (
              <TextArea
                required={field.required}
                value={values[field.key] ?? ''}
                onChange={(e) => setField(field.key, e.target.value)}
              />
            ) : (
              <TextInput
                type={field.type ?? 'text'}
                step={field.type === 'number' ? 'any' : undefined}
                required={field.required}
                value={values[field.key] ?? ''}
                onChange={(e) => setField(field.key, e.target.value)}
              />
            )}
          </Field>
        ))}
      </div>

      <div className="flex gap-3 border-t border-oven-600 pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
