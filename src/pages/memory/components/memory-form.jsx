import PropTypes from "prop-types"
import { useState } from "react"

import { MEMORY_TYPES } from "../data"
import styles from "../memory.module.css"

const DEFAULT_CATEGORY = "general"

/**
 * Validate the form fields and parse the metadata JSON.
 * @param {{content: string, memory_type: string, category: string, metadataText: string}} fields - raw form values
 * @returns {{errors: object, value?: object}} field errors, or the values to send
 */
export const validateMemoryForm = (fields) => {
  const errors = {}
  if (!fields.content.trim()) errors.content = "Content is required."
  let metadata = {}
  const text = fields.metadataText.trim()
  if (text) {
    try {
      const parsed = JSON.parse(text)
      if (
        parsed === null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        errors.metadata = "Metadata must be a valid JSON object."
      } else {
        metadata = parsed
      }
    } catch {
      errors.metadata =
        'Metadata must be valid JSON, for example {"key": "value"}.'
    }
  }
  if (Object.keys(errors).length) return { errors }
  return {
    errors,
    value: {
      content: fields.content,
      memory_type: fields.memory_type,
      category: fields.category.trim() || DEFAULT_CATEGORY,
      metadata,
    },
  }
}

const Field = ({ label, error = null, children }) => (
  <label className={styles.formField}>
    <span className={styles.secH}>{label}</span>
    {children}
    {error && (
      <span className={styles.formError} role="alert">
        {error}
      </span>
    )}
  </label>
)
Field.propTypes = {
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  children: PropTypes.node.isRequired,
}

const initialFields = (initial) => ({
  content: initial?.content ?? "",
  memory_type: initial?.memory_type ?? "episodic",
  category: initial?.category ?? "",
  metadataText: initial?.metadata
    ? JSON.stringify(initial.metadata, null, 2)
    : "",
})

/**
 * Create or edit a memory. Edit changes content and metadata only (the API
 * does not update type or category).
 */
const MemoryForm = ({
  mode,
  initial = null,
  busy = false,
  onSubmit,
  onCancel,
}) => {
  const [fields, setFields] = useState(() => initialFields(initial))
  const [errors, setErrors] = useState({})
  const edit = mode === "edit"
  const set = (key) => (e) =>
    setFields((f) => ({ ...f, [key]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const result = validateMemoryForm(fields)
    setErrors(result.errors)
    if (result.value) onSubmit(result.value)
  }

  return (
    <section className={styles.detail}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.secH}>{edit ? "Edit memory" : "New memory"}</div>
        <Field label="Type">
          <select
            className={styles.sel}
            value={fields.memory_type}
            onChange={set("memory_type")}
            disabled={edit}
          >
            {MEMORY_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <input
            className={styles.formInput}
            value={fields.category}
            onChange={set("category")}
            placeholder={DEFAULT_CATEGORY}
            disabled={edit}
          />
        </Field>
        <Field label="Content" error={errors.content}>
          <textarea
            className={styles.formInput}
            rows={5}
            value={fields.content}
            onChange={set("content")}
          />
        </Field>
        <Field label="Metadata (JSON)" error={errors.metadata}>
          <textarea
            className={styles.formInput}
            rows={5}
            spellCheck={false}
            value={fields.metadataText}
            onChange={set("metadataText")}
          />
        </Field>
        <div className={styles.dActions}>
          <button type="submit" className={styles.tbtn} disabled={busy}>
            {edit ? "Save changes" : "Save memory"}
          </button>
          <button type="button" className={styles.tbtn} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}

MemoryForm.propTypes = {
  mode: PropTypes.oneOf(["create", "edit"]).isRequired,
  initial: PropTypes.shape({
    content: PropTypes.string,
    memory_type: PropTypes.string,
    category: PropTypes.string,
    metadata: PropTypes.object,
  }),
  busy: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
}

export default MemoryForm
