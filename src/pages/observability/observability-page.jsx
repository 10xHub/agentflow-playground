import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { loadObservability } from "@/store/observability-slice"

import CostPane from "./components/cost-pane"
import DetailPanel from "./components/detail-panel"
import EventsPane from "./components/events-pane"
import ObsHeader from "./components/obs-header"
import TraceTimeline from "./components/trace-timeline"
import styles from "./observability.module.css"
import { buildViewModel } from "./transform"

// The single placeholder line shown instead of the panes, or null when there is
// a trace to render.
/**
 *
 */
const placeholderFor = ({ threadId, status, error, empty }) => {
  if (!threadId) {
    return "No active thread. Start a run in Chat to see its trace here."
  }
  if (status === "loading") return "Loading trace…"
  if (status === "error") return error || "Failed to load trace."
  if (empty) {
    return "No runs captured for this thread yet. Send a message in Chat."
  }
  return null
}

// Which id the trace / events panes should highlight for the current selection.
/**
 *
 */
const selectionIds = (sel) => {
  if (!sel) return { spanId: null, eventId: null }
  if (sel.selType === "event") return { spanId: null, eventId: sel.id }
  return { spanId: sel.id, eventId: null }
}

/**
 *
 */
const ObservabilityPage = () => {
  const dispatch = useDispatch()
  const threadId = useSelector((s) => s.chat.threadId)
  const { run, status, error, runCount } = useSelector((s) => s.observability)

  const [tab, setTab] = useState("trace")
  // null until the user picks a row; the default selection is derived below.
  const [picked, setPicked] = useState(null)

  // Load the active thread's latest run trace on mount / when the thread changes.
  useEffect(() => {
    dispatch(loadObservability(threadId))
  }, [dispatch, threadId])

  // Build the view model (spans with %-widths, events, cost) from the real run.
  const vm = useMemo(() => buildViewModel(run), [run])

  // The detail panel defaults to the last llm span once data arrives.
  const defaultSel = useMemo(() => {
    if (!vm.spans.length) return null
    const lastLlm = [...vm.spans].reverse().find((s) => s.kind === "llm")
    return lastLlm || vm.spans[0]
  }, [vm])

  const sel = picked ?? defaultSel
  const { spanId: selSpanId, eventId: selEventId } = selectionIds(sel)

  const empty = status === "empty" || (status === "ready" && !vm.spans.length)
  const placeholder = placeholderFor({ threadId, status, error, empty })

  return (
    <>
      <div className={styles.main}>
        <ObsHeader
          tab={tab}
          onTab={setTab}
          threadId={threadId}
          stats={vm.stats}
          runCount={runCount}
        />

        <div className={styles.body}>
          {placeholder ? (
            <div className={styles.obsEmpty}>{placeholder}</div>
          ) : (
            <>
              {tab === "trace" && (
                <TraceTimeline
                  spans={vm.spans}
                  ruler={vm.ruler}
                  selectedId={selSpanId}
                  onSelect={setPicked}
                />
              )}
              {tab === "events" && (
                <EventsPane
                  events={vm.events}
                  selectedId={selEventId}
                  onSelect={setPicked}
                />
              )}
              {tab === "cost" && <CostPane cost={vm.cost} />}
            </>
          )}
        </div>
      </div>

      <DetailPanel sel={sel} />
    </>
  )
}

export default ObservabilityPage
