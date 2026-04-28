/* eslint-disable unicorn/filename-case */
import { useEffect, useState } from "react"

const initialExecutionMeta = {
  current_node: "",
  step: 0,
  status: "idle",
  interrupted_node: [],
  interrupt_reason: "",
  interrupt_data: [],
  thread_id: "",
  internal_data: {},
}

const staticFields = ["context", "execution_meta", "context_summary"]

const getDefaultValue = (type) => {
  switch (type) {
    case "string":
      return ""
    case "number":
      return 0
    case "array":
      return []
    case "object":
      return {}
    case "boolean":
      return false
    default:
      return null
  }
}

const computeFormData = (stateData, stateSchema) => {
  const next = {
    context: Array.isArray(stateData?.context) ? stateData.context : [],
    context_summary: stateData?.context_summary || "",
    execution_meta: {
      ...initialExecutionMeta,
      ...(stateData?.execution_meta || {}),
    },
  }

  Object.keys(stateData || {}).forEach((key) => {
    if (staticFields.includes(key)) return
    next[key] = stateData[key]
  })

  Object.keys(stateSchema || {}).forEach((key) => {
    if (staticFields.includes(key)) return
    if (stateData?.[key] !== undefined) {
      next[key] = stateData[key]
      return
    }
    next[key] =
      stateSchema[key]?.default ?? getDefaultValue(stateSchema[key]?.type)
  })

  return next
}

/**
 * Custom hook for form data management
 */
const useFormData = (stateData, stateSchema = {}) => {
  const [formData, setFormData] = useState(() =>
    computeFormData(stateData, stateSchema)
  )

  const stableStateKey = JSON.stringify(stateData || {})
  // Stringify schema to get a stable primitive key (avoids new-reference-each-render issue)
  const stableSchemaKey = JSON.stringify(stateSchema)

  useEffect(() => {
    setFormData(
      computeFormData(JSON.parse(stableStateKey), JSON.parse(stableSchemaKey))
    )
  }, [stableStateKey, stableSchemaKey])

  const updateField = (path, value) => {
    setFormData((previousFormData) => {
      const newFormData = JSON.parse(JSON.stringify(previousFormData))
      const keys = path.split(".")
      let current = newFormData

      for (let keyIndex = 0; keyIndex < keys.length - 1; keyIndex++) {
        if (!current[keys[keyIndex]]) current[keys[keyIndex]] = {}
        current = current[keys[keyIndex]]
      }
      current[keys[keys.length - 1]] = value
      return newFormData
    })
  }

  const updateNumberField = (path, value) => {
    const numberValue = parseInt(value) || 0
    updateField(path, numberValue)
  }

  const updateArrayItem = (path, itemIndex, value) => {
    setFormData((previousFormData) => {
      const newFormData = JSON.parse(JSON.stringify(previousFormData))
      const keys = path.split(".")
      let current = newFormData

      for (let keyIndex = 0; keyIndex < keys.length - 1; keyIndex++) {
        current = current[keys[keyIndex]]
      }
      const arrayField = keys[keys.length - 1]
      current[arrayField][itemIndex] = value
      return newFormData
    })
  }

  const addArrayItem = (path, item = "") => {
    setFormData((previousFormData) => {
      const newFormData = JSON.parse(JSON.stringify(previousFormData))
      const keys = path.split(".")
      let current = newFormData

      for (let keyIndex = 0; keyIndex < keys.length - 1; keyIndex++) {
        if (!current[keys[keyIndex]]) current[keys[keyIndex]] = {}
        current = current[keys[keyIndex]]
      }
      const arrayField = keys[keys.length - 1]
      if (!current[arrayField]) current[arrayField] = []
      current[arrayField].push(item)
      return newFormData
    })
  }

  const removeArrayItem = (path, itemIndex) => {
    setFormData((previousFormData) => {
      const newFormData = JSON.parse(JSON.stringify(previousFormData))
      const keys = path.split(".")
      let current = newFormData

      for (let keyIndex = 0; keyIndex < keys.length - 1; keyIndex++) {
        current = current[keys[keyIndex]]
      }
      const arrayField = keys[keys.length - 1]
      current[arrayField].splice(itemIndex, 1)
      return newFormData
    })
  }

  return {
    formData,
    updateField,
    updateNumberField,
    updateArrayItem,
    addArrayItem,
    removeArrayItem,
  }
}

export default useFormData
