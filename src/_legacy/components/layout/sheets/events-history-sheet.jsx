import { Activity, ChevronDown, Radio, Trash2 } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { Button } from "@/components/ui/button"
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
import { clearEvents } from "@/services/store/slices/events.slice"
import ct from "@constants/"

const formatEventTimestamp = (timestamp) => {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return "--"
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

const formatPayload = (payload) => JSON.stringify(payload, null, 2)

const getEventTone = (event) => {
  switch (event) {
    case "message":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/80 dark:bg-blue-950/40 dark:text-blue-300"
    case "updates":
    case "state":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/40 dark:text-amber-300"
    default:
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
  }
}

const EventEntry = ({ entry }) => {
  const [isOpen, setIsOpen] = useState(false)
  const formattedPayload = formatPayload(entry.payload)

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="overflow-hidden rounded-xl border bg-card/80 shadow-sm"
    >
      <CollapsibleTrigger className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/40">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${getEventTone(entry.event)}`}
            >
              {entry.event}
            </span>
            {entry.threadId && (
              <span className="max-w-full truncate rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                Thread {entry.threadId}
              </span>
            )}
            {entry.runId && (
              <span className="max-w-full truncate rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                Run {entry.runId}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {isOpen ? "Hide raw payload" : "View raw payload"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <span>{formatEventTimestamp(entry.timestamp)}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="min-w-0 px-4 pb-4">
          <pre className="max-w-full overflow-x-hidden whitespace-pre-wrap break-words rounded-lg border bg-slate-950 p-3 text-xs leading-6 text-slate-100">
            {formattedPayload}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

EventEntry.propTypes = {
  entry: PropTypes.shape({
    id: PropTypes.string.isRequired,
    event: PropTypes.string.isRequired,
    payload: PropTypes.any,
    timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
      .isRequired,
    threadId: PropTypes.string,
    runId: PropTypes.string,
  }).isRequired,
}

/**
 * EventsHistorySheet component displays application events history
 * @returns {object} Sheet component displaying events history
 */
const EventsHistorySheet = ({ isOpen, onClose }) => {
  const dispatch = useDispatch()
  const { entries, isStreaming } = useSelector((state) => ({
    entries: state[ct.store.EVENTS_STORE]?.entries || [],
    isStreaming: Boolean(state[ct.store.EVENTS_STORE]?.isStreaming),
  }))

  const totalEntries = entries.length
  const [latestEvent] = entries
  const handleClear = () => dispatch(clearEvents())

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="rightLarge" className="flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>Streaming Events</SheetTitle>
          <SheetDescription>
            Raw backend stream chunks for the active streaming request only.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid flex-shrink-0 grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Total
            </p>
            <p className="mt-2 text-2xl font-semibold">{totalEntries}</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Status
            </p>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
              <Radio
                className={`h-4 w-4 ${isStreaming ? "text-emerald-500" : "text-muted-foreground"}`}
              />
              <span>{isStreaming ? "Streaming" : "Idle"}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-shrink-0 items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {latestEvent
              ? `Latest chunk at ${formatEventTimestamp(latestEvent.timestamp)}`
              : "No streaming chunks captured yet"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={entries.length === 0}
            className="gap-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear log
          </Button>
        </div>
        <ScrollArea className="mt-4 min-w-0 flex-1 overflow-hidden pr-4">
          {entries.length === 0 ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">
                No stream events yet
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Enable streaming response and send a message to inspect the raw
                backend chunks here.
              </p>
            </div>
          ) : (
            <div className="min-w-0 space-y-3 overflow-x-hidden pb-6">
              {entries.map((entry) => (
                <EventEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

EventsHistorySheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default EventsHistorySheet
