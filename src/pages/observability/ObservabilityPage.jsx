import { useState } from "react"

import CostPane from "./components/CostPane"
import DetailPanel from "./components/DetailPanel"
import EventsPane from "./components/EventsPane"
import ObsHeader from "./components/ObsHeader"
import TraceTimeline from "./components/TraceTimeline"
import { SPANS } from "./data"
import styles from "./observability.module.css"

// Default detail = the final llm.generate span (matches the mockup's initial panel).
const DEFAULT_SPAN = SPANS.find((s) => s.id === "s6")

export default function ObservabilityPage() {
  const [tab, setTab] = useState("trace")
  const [sel, setSel] = useState(DEFAULT_SPAN)

  const selSpanId = sel?.selType === "event" ? null : sel?.id
  const selEventId = sel?.selType === "event" ? sel.id : null

  return (
    <>
      <div className={styles.main}>
        <ObsHeader tab={tab} onTab={setTab} />

        <div className={styles.body}>
          {tab === "trace" && (
            <TraceTimeline selectedId={selSpanId} onSelect={setSel} />
          )}
          {tab === "events" && (
            <EventsPane selectedId={selEventId} onSelect={setSel} />
          )}
          {tab === "cost" && <CostPane />}
        </div>
      </div>

      <DetailPanel sel={sel} />
    </>
  )
}
