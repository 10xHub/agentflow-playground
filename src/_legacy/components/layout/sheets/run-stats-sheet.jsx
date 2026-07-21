import { ChevronDown, Coins, Gauge, Repeat, Timer, Wrench } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"
import { useSelector } from "react-redux"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatDuration, formatTokenCount, hasTokens } from "@/lib/token-usage"
import ct from "@constants/"

import {
  selectLatestRun,
  selectRunHistory,
} from "@/services/store/slices/runs.slice"

const formatRunTime = (timestamp) => {
  if (!timestamp) {
    return "--"
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return "--"
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

const STATUS_TONE = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-300",
  running:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/80 dark:bg-blue-950/40 dark:text-blue-300",
  error:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/80 dark:bg-red-950/40 dark:text-red-300",
  stopped:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/40 dark:text-amber-300",
}

const TokenBreakdown = ({ tokens }) => {
  const rows = [
    { label: "Prompt", value: tokens.prompt },
    { label: "Completion", value: tokens.completion },
    { label: "Reasoning", value: tokens.reasoning },
    { label: "Cache read", value: tokens.cacheRead },
    { label: "Cache write", value: tokens.cacheCreate },
    { label: "Image", value: tokens.image },
    { label: "Audio", value: tokens.audio },
  ].filter((row) => row.value > 0)

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="mt-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-4 py-0.5"
        >
          <span className="text-muted-foreground">{row.label}</span>
          <span className="font-mono tabular-nums">
            {row.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

TokenBreakdown.propTypes = {
  tokens: PropTypes.object.isRequired,
}

const RunMetric = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-2">
    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    <span className="font-semibold">{value}</span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
)

RunMetric.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
}

const RunEntry = ({ run, defaultOpen }) => {
  const [isOpen, setIsOpen] = useState(Boolean(defaultOpen))
  const tokensPresent = hasTokens(run.tokens)

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="overflow-hidden rounded-xl border bg-card/80 shadow-sm"
    >
      <CollapsibleTrigger className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/40">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                STATUS_TONE[run.status] || STATUS_TONE.done
              }`}
            >
              {run.status}
            </span>
            <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
              {run.mode}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatRunTime(run.startedAt)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <RunMetric
              icon={Coins}
              label="tokens"
              value={tokensPresent ? formatTokenCount(run.tokens.total) : "n/a"}
            />
            <RunMetric
              icon={Repeat}
              label={run.iterations === 1 ? "iteration" : "iterations"}
              value={run.iterations}
            />
            {run.toolCallCount > 0 && (
              <RunMetric
                icon={Wrench}
                label="tool calls"
                value={run.toolCallCount}
              />
            )}
            <RunMetric
              icon={Timer}
              label="duration"
              value={formatDuration(run.durationMs)}
            />
          </div>
        </div>
        {tokensPresent && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </CollapsibleTrigger>
      {tokensPresent && (
        <CollapsibleContent>
          <div className="px-4 pb-4">
            <TokenBreakdown tokens={run.tokens} />
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

RunEntry.propTypes = {
  run: PropTypes.object.isRequired,
  defaultOpen: PropTypes.bool,
}

RunEntry.defaultProps = {
  defaultOpen: false,
}

/**
 * RunStatsSheet shows per-run token usage, iterations, tool calls, and duration
 * for the active thread — the latest run plus this session's history.
 */
const RunStatsSheet = ({ isOpen, onClose }) => {
  const threadId = useSelector(
    (state) => state[ct.store.CHAT_STORE]?.activeThreadId
  )
  const latestRun = useSelector((state) => selectLatestRun(state, threadId))
  const history = useSelector((state) => selectRunHistory(state, threadId))

  const sessionTotal = history.reduce(
    (total, run) => total + (run.tokens?.total || 0),
    0
  )

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="rightLarge" className="flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>Run Stats</SheetTitle>
          <SheetDescription>
            Token usage, iterations, and timing per run for this thread.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid flex-shrink-0 grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Latest run
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {latestRun && hasTokens(latestRun.tokens)
                ? formatTokenCount(latestRun.tokens.total)
                : "--"}
            </p>
            <p className="text-xs text-muted-foreground">total tokens</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Session
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {sessionTotal > 0 ? formatTokenCount(sessionTotal) : "--"}
            </p>
            <p className="text-xs text-muted-foreground">
              tokens · {history.length} {history.length === 1 ? "run" : "runs"}
            </p>
          </div>
        </div>

        <ScrollArea className="mt-4 min-w-0 flex-1 overflow-hidden pr-4">
          {history.length === 0 ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
                <Gauge className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">No runs yet</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Send a message to see per-run token usage, iterations, and
                timing here.
              </p>
            </div>
          ) : (
            <div className="min-w-0 space-y-3 pb-6">
              {history.map((run, index) => (
                <RunEntry key={run.id} run={run} defaultOpen={index === 0} />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

RunStatsSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default RunStatsSheet
