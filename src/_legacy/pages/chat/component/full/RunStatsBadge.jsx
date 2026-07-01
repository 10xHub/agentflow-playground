/* eslint-disable unicorn/filename-case */
import { ChevronDown, Coins, Repeat, Timer, Wrench } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { formatDuration, formatTokenCount, hasTokens } from "@/lib/token-usage"

const Stat = ({ icon: Icon, children, title }) => (
  <span className="inline-flex items-center gap-1" title={title}>
    <Icon className="h-3 w-3" />
    {children}
  </span>
)

Stat.propTypes = {
  icon: PropTypes.elementType.isRequired,
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
}

Stat.defaultProps = {
  title: undefined,
}

const BreakdownRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 py-0.5">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono tabular-nums">{value.toLocaleString()}</span>
  </div>
)

BreakdownRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
}

/**
 * Compact per-run token / iteration readout shown beneath the final assistant
 * message of a run. Expands to a full token breakdown.
 */
const RunStatsBadge = ({ run }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { tokens } = run
  const tokensPresent = hasTokens(tokens)

  const breakdown = [
    { label: "Prompt", value: tokens.prompt },
    { label: "Completion", value: tokens.completion },
    { label: "Reasoning", value: tokens.reasoning },
    { label: "Cache read", value: tokens.cacheRead },
    { label: "Cache write", value: tokens.cacheCreate },
    { label: "Image", value: tokens.image },
    { label: "Audio", value: tokens.audio },
  ].filter((row) => row.value > 0)

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="inline-block rounded-lg border bg-muted/30 text-[11px] text-muted-foreground"
    >
      <CollapsibleTrigger className="flex items-center gap-3 px-2.5 py-1 transition-colors hover:bg-muted/60">
        {tokensPresent && (
          <Stat icon={Coins} title="Total tokens">
            <span className="font-medium text-foreground/80">
              {formatTokenCount(tokens.total)}
            </span>
            <span>tokens</span>
          </Stat>
        )}
        <Stat icon={Repeat} title="Model iterations in this run">
          {run.iterations}
          <span>{run.iterations === 1 ? "iter" : "iters"}</span>
        </Stat>
        {run.toolCallCount > 0 && (
          <Stat icon={Wrench} title="Tool calls">
            {run.toolCallCount}
          </Stat>
        )}
        {run.durationMs !== null && run.durationMs !== undefined && (
          <Stat icon={Timer} title="Run duration">
            {formatDuration(run.durationMs)}
          </Stat>
        )}
        {tokensPresent && (
          <ChevronDown
            className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </CollapsibleTrigger>
      {tokensPresent && breakdown.length > 0 && (
        <CollapsibleContent>
          <div className="min-w-[180px] border-t px-2.5 py-1.5">
            {breakdown.map((row) => (
              <BreakdownRow
                key={row.label}
                label={row.label}
                value={row.value}
              />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

RunStatsBadge.propTypes = {
  run: PropTypes.shape({
    iterations: PropTypes.number,
    toolCallCount: PropTypes.number,
    durationMs: PropTypes.number,
    tokens: PropTypes.object.isRequired,
  }).isRequired,
}

export default RunStatsBadge
