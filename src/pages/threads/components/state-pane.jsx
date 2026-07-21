import { Trash2 } from "lucide-react"
import PropTypes from "prop-types"
import { useDispatch, useSelector } from "react-redux"

import { clearThread } from "@/store/threads-slice"

import styles from "../threads.module.css"

/**
 *
 */
const KvCard = ({ title, rows }) => (
  <div className={styles.scard}>
    <h3>{title}</h3>
    {rows.length === 0 && <div className={styles.kv}>—</div>}
    {rows.map((r) => (
      <div className={styles.kv} key={r.k}>
        <span className={styles.k}>{r.k}</span>
        <span className={`${styles.v} ${r.tone ? styles[r.tone] : ""}`}>
          {r.v}
        </span>
      </div>
    ))}
  </div>
)

KvCard.propTypes = {
  title: PropTypes.string.isRequired,
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      k: PropTypes.string,
      v: PropTypes.node,
      tone: PropTypes.string,
    })
  ).isRequired,
}

// Turn execution_meta into displayable kv rows with tone.
const metaRows = (em) => {
  if (!em) return []
  const toneFor = (k, v) => {
    if (k === "is_running") return v ? "warn" : "muted"
    if (k === "interrupted" || k === "stopped") return v ? "bad" : "muted"
    return undefined
  }
  return Object.entries(em)
    .filter(([, v]) => typeof v !== "object" || v === null)
    .map(([k, v]) => ({ k, v: String(v), tone: toneFor(k, v) }))
}

// Summarise the thread context block as kv rows.
/**
 *
 */
const contextRowsOf = (state, selectedId) => [
  { k: "messages", v: String((state.context || []).length) },
  {
    k: "context_summary",
    v: state.context_summary || "none",
    tone: state.context_summary ? undefined : "muted",
  },
  { k: "thread_id", v: selectedId?.slice(0, 12) || "—" },
]

/**
 *
 */
const StatePane = () => {
  const dispatch = useDispatch()
  const { selectedId, detail, detailStatus, busy } = useSelector(
    (s) => s.threads
  )
  const state = detail?.state

  if (detailStatus === "loading") {
    return <div className={styles.paneEmpty}>Loading state…</div>
  }
  if (!state) {
    return <div className={styles.paneEmpty}>No state for this thread.</div>
  }

  const contextRows = contextRowsOf(state, selectedId)

  return (
    <div className={busy ? styles.dim : ""}>
      <div className={styles.stateGrid}>
        <KvCard title="execution_meta" rows={metaRows(state.execution_meta)} />
        <KvCard title="context" rows={contextRows} />
      </div>

      <h3 className={styles.sectionH}>raw state</h3>
      <pre className={styles.rawState}>{JSON.stringify(state, null, 2)}</pre>

      <div className={styles.stateActions}>
        <button
          type="button"
          className={`${styles.tbtn} ${styles.danger}`}
          disabled={busy || !selectedId}
          onClick={() => dispatch(clearThread(selectedId))}
        >
          <Trash2 size={14} strokeWidth={1.7} />
          Clear state
        </button>
      </div>
    </div>
  )
}

export default StatePane
