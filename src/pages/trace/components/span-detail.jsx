import { AlertTriangle } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"

import styles from "../trace-detail.module.css"
import { bubblesFor, hasValue, metaRows } from "../values"

import JsonView from "./json-view"
import MessageBubbles from "./message-bubbles"

const TABS = [
  { id: "inputs", label: "Inputs" },
  { id: "outputs", label: "Outputs" },
  { id: "meta", label: "Metadata" },
]

// Why a side has nothing to show. The llm prompt is never recorded by core.
const emptyText = (span, side) => {
  if (span.kind === "llm" && side === "inputs") {
    return "The model prompt is not recorded: core does not put it on the stream."
  }
  return `No ${side === "inputs" ? "input" : "output"} recorded for this span.`
}

/**
 * Bubbles when the payload looks like messages, then the raw JSON.
 */
const Payload = ({ span, side }) => {
  const value = span[side]
  if (!hasValue(value)) {
    return <div className={styles.dEmpty}>{emptyText(span, side)}</div>
  }
  const bubbles = bubblesFor(value)
  return (
    <>
      {bubbles && <MessageBubbles messages={bubbles} />}
      <div className={styles.dSub}>JSON</div>
      <JsonView value={value} />
    </>
  )
}

Payload.propTypes = {
  span: PropTypes.object.isRequired,
  side: PropTypes.string.isRequired,
}

const Metadata = ({ span, run = null }) => {
  const rows = metaRows(span)
  if (span.kind === "root" && run?.models?.length) {
    rows.push({ key: "models", value: run.models.join(", ") })
  }
  return (
    <div>
      {rows.map((r) => (
        <div className={styles.metaRow} key={r.key}>
          <span className={styles.metaKey}>{r.key}</span>
          <span className={styles.metaVal}>{String(r.value)}</span>
        </div>
      ))}
    </div>
  )
}

Metadata.propTypes = {
  span: PropTypes.object.isRequired,
  run: PropTypes.object,
}

/**
 * Detail for the selected span: error first, then Inputs / Outputs / Metadata.
 */
const SpanDetail = ({ span = null, run = null }) => {
  const [tab, setTab] = useState("inputs")
  if (!span) {
    return (
      <aside className={styles.detail}>
        <div className={styles.dEmpty}>Select a span to see its details.</div>
      </aside>
    )
  }
  return (
    <aside className={styles.detail} aria-label="Span detail">
      <div className={styles.dHead}>
        <span className={styles.dKind}>{span.kind}</span>
        <span className={styles.dName}>{span.name}</span>
      </div>
      {span.status === "error" && (
        <div className={styles.dError} role="alert">
          <AlertTriangle size={14} />
          <span>{span.error || "This span ended with an error."}</span>
        </div>
      )}
      <div className={styles.dTabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.dTab} ${tab === t.id ? styles.on : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={styles.dBody}>
        {tab === "meta" ? (
          <Metadata span={span} run={run} />
        ) : (
          <Payload span={span} side={tab} />
        )}
      </div>
    </aside>
  )
}

SpanDetail.propTypes = { span: PropTypes.object, run: PropTypes.object }

export default SpanDetail
