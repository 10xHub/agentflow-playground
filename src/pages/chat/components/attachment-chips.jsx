import { Loader2, Paperclip, X } from "lucide-react"
import PropTypes from "prop-types"
import { useRef } from "react"

import { InputGroupButton } from "@/components/ui/input-group"

/** The paperclip button and its hidden file input. */
export const AttachButton = ({ onPick, disabled = false }) => {
  const input = useRef(null)
  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        aria-label="Attach file"
        onChange={(e) => {
          ;[...(e.target.files || [])].forEach(onPick)
          e.target.value = ""
        }}
      />
      <InputGroupButton
        size="icon-xs"
        title="Attach a file"
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        <Paperclip />
      </InputGroupButton>
    </>
  )
}

AttachButton.propTypes = {
  onPick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
}

/** One chip per picked file: name, upload state, error text, remove. */
export const AttachmentChips = ({ chips, onRemove }) => {
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c.key}
          className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-[11.5px]"
        >
          {c.status === "uploading" && (
            <Loader2 className="size-3 animate-spin" />
          )}
          <span>{c.name}</span>
          {c.status === "error" && (
            <span className="text-destructive">{c.error}</span>
          )}
          <button
            type="button"
            aria-label={`Remove ${c.name}`}
            onClick={() => onRemove(c.key)}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
    </div>
  )
}

AttachmentChips.propTypes = {
  chips: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      error: PropTypes.string,
    })
  ).isRequired,
  onRemove: PropTypes.func.isRequired,
}
