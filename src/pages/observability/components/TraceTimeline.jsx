import { Clock } from "lucide-react"

import styles from "../observability.module.css"

const LEGEND = [
  { kind: "root", label: "graph" },
  { kind: "node", label: "node" },
  { kind: "llm", label: "llm" },
  { kind: "tool", label: "tool" },
]

export default function TraceTimeline({ spans, ruler, selectedId, onSelect }) {
  return (
    <div>
      <div className={styles.srcNote}>
        <Clock size={13} strokeWidth={1.7} />
        Reconstructed from run events · graph → node → llm → tool · session.id =
        thread_id
      </div>

      <div className={styles.ruler}>
        {ruler.map((r, i) => (
          <span key={`${r}-${i}`}>{r}</span>
        ))}
      </div>

      {spans.map((s) => (
        <div
          key={s.id}
          className={`${styles.span} ${selectedId === s.id ? styles.sel : ""}`}
          onClick={() => onSelect(s)}
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
