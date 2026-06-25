import PropTypes from "prop-types"

import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

const snippet = (text = "", max = 120) =>
  text.length > max ? `${text.slice(0, max)}…` : text

const formatScore = (score) =>
  typeof score === "number" ? score.toFixed(3) : null

const MemoryRow = ({ memory, isActive, showScore, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(memory.id)}
    className={`w-full rounded-lg border p-3 text-left transition-colors ${
      isActive
        ? "border-primary bg-primary/5"
        : "border-border hover:border-primary/40 hover:bg-muted/50"
    }`}
  >
    <div className="flex items-center justify-between gap-2">
      <Badge variant="secondary" className="text-[10px] uppercase">
        {memory.memory_type || "unknown"}
      </Badge>
      {showScore && formatScore(memory.score) !== null && (
        <span className="text-xs text-muted-foreground">
          score {formatScore(memory.score)}
        </span>
      )}
    </div>
    <p className="mt-2 text-sm leading-5 text-foreground">
      {snippet(memory.content) || (
        <span className="italic text-muted-foreground">No content</span>
      )}
    </p>
    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
      {memory.category && <span>{memory.category}</span>}
      {memory.timestamp && <span>· {memory.timestamp}</span>}
    </div>
  </button>
)

MemoryRow.propTypes = {
  memory: PropTypes.object.isRequired,
  isActive: PropTypes.bool.isRequired,
  showScore: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
}

const MemoryList = ({ items, selectedId, showScore, isLoading, onSelect }) => {
  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3, 4].map((key) => (
          <Skeleton key={key} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        No memories found. Adjust your scope/search or add one.
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        {items.map((memory) => (
          <MemoryRow
            key={memory.id}
            memory={memory}
            isActive={memory.id === selectedId}
            showScore={showScore}
            onSelect={onSelect}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

MemoryList.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedId: PropTypes.string,
  showScore: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
}

MemoryList.defaultProps = {
  selectedId: null,
}

export default MemoryList
