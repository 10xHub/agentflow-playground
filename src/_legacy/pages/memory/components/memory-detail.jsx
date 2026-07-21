import { Pencil, Trash2 } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"

const Field = ({ label, value }) =>
  value ? (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm break-words">{value}</p>
    </div>
  ) : null

Field.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
}

Field.defaultProps = { value: null }

const MemoryDetail = ({ memory, isDeleting, onEdit, onDelete }) => {
  const [confirming, setConfirming] = useState(false)

  if (!memory) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Select a memory to inspect its content, metadata, and embedding.
      </div>
    )
  }

  const vector = Array.isArray(memory.vector) ? memory.vector : []

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-4">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary" className="uppercase">
            {memory.memory_type || "unknown"}
          </Badge>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(memory)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            {confirming ? (
              <Button
                size="sm"
                variant="destructive"
                disabled={isDeleting}
                onClick={() => onDelete(memory.id)}
              >
                {isDeleting ? "Deleting…" : "Confirm delete"}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirming(true)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Content
          </p>
          <p className="whitespace-pre-wrap text-sm leading-6">
            {memory.content}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" value={memory.category} />
          <Field
            label="Score"
            value={
              typeof memory.score === "number" ? memory.score.toFixed(4) : null
            }
          />
          <Field label="User ID" value={memory.user_id} />
          <Field label="Thread ID" value={memory.thread_id} />
          <Field label="Timestamp" value={memory.timestamp} />
          <Field label="Memory ID" value={memory.id} />
        </div>

        {memory.metadata && Object.keys(memory.metadata).length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Metadata
            </p>
            <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(memory.metadata, null, 2)}
            </pre>
          </div>
        )}

        {vector.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="text-xs text-muted-foreground underline">
              Embedding vector ({vector.length} dims)
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted p-3 text-[11px]">
                {JSON.stringify(vector)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </ScrollArea>
  )
}

MemoryDetail.propTypes = {
  memory: PropTypes.object,
  isDeleting: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}

MemoryDetail.defaultProps = {
  memory: null,
}

export default MemoryDetail
