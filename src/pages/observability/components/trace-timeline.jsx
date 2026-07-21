import { Clock } from "lucide-react"
import PropTypes from "prop-types"

import styles from "../observability.module.css"

const LEGEND = [
  { kind: "root", label: "graph" },
  { kind: "node", label: "node" },
  { kind: "llm", label: "llm" },
  { kind: "tool", label: "tool" },
]

// Keyboard equivalent of the row click, for the role="button" rows below.
const activateOnKey = (event, fire) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault()
    fire()
  }
}

/**
 *
 */
const TraceTimeline = ({ spans, ruler, selectedId = null, onSelect }) => {
  return (
    <div>
      <div className={styles.srcNote}>
        <Clock size={13} strokeWidth={1.7} />
        Reconstructed from run events · graph → node → llm → tool · session.id =
        thread_id
      </div>

      <div className={styles.ruler}>
        {ruler.map((r) => (
          <span key={r.at}>{r.label}</span>
        ))}
      </div>

      {spans.map((s) => (
        <div
          key={s.id}
          className={`${styles.span} ${selectedId === s.id ? styles.sel : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(s)}
          onKeyDown={(event) => activateOnKey(event, () => onSelect(s))}
        >
          <div className={styles.spanLabel}>
            {s.indent && <span className={styles.indent}>{s.indent}</span>}
            <span className={`${styles.kindDot} ${styles[s.kind]}`} />
            {s.label}
          </div>
          <div className={styles.spanTrack}>
            <div
              className={`${styles.spanBar} ${styles[s.kind]}`}
              style={{ left: `${s.left}%`, width: `${s.width}%` }}
            >
              <span className={styles.spanDur}>{s.dur}</span>
            </div>
          </div>
        </div>
      ))}

      <div className={styles.legend}>
        {LEGEND.map((l) => (
          <span key={l.kind}>
            <span className={`${styles.kindDot} ${styles[l.kind]}`} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}

TraceTimeline.propTypes = {
  spans: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      kind: PropTypes.string,
      label: PropTypes.node,
      indent: PropTypes.string,
      left: PropTypes.number,
      width: PropTypes.number,
      dur: PropTypes.string,
    })
  ).isRequired,
  ruler: PropTypes.arrayOf(
    PropTypes.shape({
      at: PropTypes.number.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
}

export default TraceTimeline
