import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { loadObservability } from "@/store/observabilitySlice"

import CostPane from "./components/CostPane"
import DetailPanel from "./components/DetailPanel"
import EventsPane from "./components/EventsPane"
import ObsHeader from "./components/ObsHeader"
import TraceTimeline from "./components/TraceTimeline"
import styles from "./observability.module.css"
import { buildViewModel } from "./transform"

/**
 *
 */
export default function ObservabilityPage() {
  const dispatch = useDispatch()
  const threadId = useSelector((s) => s.chat.threadId)
  const { run, status, error, runCount } = useSelector((s) => s.observability)

  const [tab, setTab] = useState("trace")
  const [sel, setSel] = useState(null)

  // Load the active thread's latest run trace on mount / when the thread changes.
  useEffect(() => {
    dispatch(loadObservability(threadId))
  }, [dispatch, threadId])

  // Build the view model (spans with %-widths, events, cost) from the real run.
  const vm = useMemo(() => buildViewModel(run), [run])

  // Default the detail panel to the last llm span once data arrives.
  useEffect(() => {
    if (!sel && vm.spans.length) {
      const lastLlm = [...vm.spans].reverse().find((s) => s.kind === "llm")
      setSel(lastLlm || vm.spans[0])
    }
  }, [vm, sel])

  const selSpanId = sel?.selType === "event" ? null : sel?.id
  const selEventId = sel?.selType === "event" ? sel.id : null

  const empty = status === "empty" || (status === "ready" && !vm.spans.length)

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
          {!threadId ? (
            <div className={styles.obsEmpty}>
              No active thread. Start a run in Chat to see its trace here.
            </div>
          ) : status === "loading" ? (
            <div className={styles.obsEmpty}>Loading trace…</div>
          ) : status === "error" ? (
            <div className={styles.obsEmpty}>
              {error || "Failed to load trace."}
            </div>
          ) : empty ? (
            <div className={styles.obsEmpty}>
              No runs captured for this thread yet. Send a message in Chat.
            </div>
          ) : (
            <>
              {tab === "trace" && (
                <TraceTimeline
                  spans={vm.spans}
                  ruler={vm.ruler}
                  selectedId={selSpanId}
                  onSelect={setSel}
                />
              )}
              {tab === "events" && (
                <EventsPane
                  events={vm.events}
                  selectedId={selEventId}
                  onSelect={setSel}
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
