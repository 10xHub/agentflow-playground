import PropTypes from "prop-types"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { MEMORY_TYPE_OPTIONS, DEFAULT_MEMORY_TYPE } from "../memory-options"

import FieldSelect from "./field-select"

const parseMetadata = (text) => {
  const trimmed = text.trim()
  if (!trimmed) {
    return { value: {}, error: null }
  }
  try {
    const parsed = JSON.parse(trimmed)
    if (typeof parsed !== "object" || Array.isArray(parsed)) {
      return { value: null, error: "Metadata must be a JSON object" }
    }
    return { value: parsed, error: null }
  } catch {
    return { value: null, error: "Invalid JSON" }
  }
}

const getInitialValues = (initial) => ({
  content: initial?.content || "",
  memoryType: initial?.memory_type || DEFAULT_MEMORY_TYPE,
  category: initial?.category || "",
  metadataText: initial?.metadata
    ? JSON.stringify(initial.metadata, null, 2)
    : "",
})

/**
 * Add/Edit form. In edit mode the memory type and category are read-only because
 * the client's updateMemory only accepts content + metadata.
 */
const MemoryForm = ({ mode, initial, isSaving, onCancel, onSubmit }) => {
  const isEdit = mode === "edit"
  const defaults = getInitialValues(initial)
  const [content, setContent] = useState(defaults.content)
  const [memoryType, setMemoryType] = useState(defaults.memoryType)
  const [category, setCategory] = useState(defaults.category)
  const [metadataText, setMetadataText] = useState(defaults.metadataText)
  const [metadataError, setMetadataError] = useState(null)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!content.trim()) {
      return
    }
    const { value, error } = parseMetadata(metadataText)
    if (error) {
      setMetadataError(error)
      return
    }
    setMetadataError(null)
    onSubmit({
      content: content.trim(),
      memory_type: memoryType,
      category: category.trim(),
      metadata: value,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold">
        {isEdit ? "Edit memory" : "Add memory"}
      </h3>
      <div className="space-y-1.5">
        <Label htmlFor="memory-content">Content</Label>
        <Textarea
          id="memory-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="What should the agent remember?"
          className="min-h-[120px]"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldSelect
          id="memory-type"
          label="Type"
          value={memoryType}
          onChange={setMemoryType}
          options={MEMORY_TYPE_OPTIONS}
          disabled={isEdit}
        />
        <div className="space-y-1.5">
          <Label htmlFor="memory-category" className="text-xs">
            Category
          </Label>
          <Input
            id="memory-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="e.g. preferences"
            disabled={isEdit}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="memory-metadata" className="text-xs">
          Metadata (JSON)
        </Label>
        <Textarea
          id="memory-metadata"
          value={metadataText}
          onChange={(event) => setMetadataText(event.target.value)}
          placeholder='{ "tags": ["important"] }'
          className="min-h-[80px] font-mono text-xs"
        />
        {metadataError && (
          <p className="text-xs text-destructive">{metadataError}</p>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || !content.trim()}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  )
}

MemoryForm.propTypes = {
  mode: PropTypes.oneOf(["add", "edit"]).isRequired,
  initial: PropTypes.object,
  isSaving: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
}

MemoryForm.defaultProps = {
  initial: null,
}

export default MemoryForm
