import { Check, Pencil, Trash2 } from "lucide-react"

import { CONFIG_JSON, CONTEXT, EXECUTION_META } from "../data"
import JsonBlock from "./JsonBlock"
import styles from "../threads.module.css"

function KvCard({ title, rows }) {
  return (
    <div className={styles.scard}>
      <h3>{title}</h3>
      {rows.map((r) => (
        <div className={styles.kv} key={r.k}>
          <span className={styles.k}>{r.k}</span>
          <span className={`${styles.v} ${r.tone ? styles[r.tone] : ""}`}>{r.v}</span>
        </div>
      ))}
    </div>
  )
}

export default function StatePane({ verified, onRecheck }) {
  return (
    <div>
      <div className={styles.stateGrid}>
        <KvCard title="execution_meta" rows={EXECUTION_META} />
        <KvCard title="context" rows={CONTEXT} />
      </div>

      <h3 className={styles.sectionH}>config</h3>
      <JsonBlock lines={CONFIG_JSON} />

      <div className={styles.stateActions}>
        <button type="button" className={styles.tbtn}>
          <Pencil size={14} strokeWidth={1.7} />
          Edit state
        </button>
        <button type="button" className={`${styles.tbtn} ${styles.danger}`}>
          <Trash2 size={14} strokeWidth={1.7} />
          Clear state
        </button>
        <button type="button" className={styles.tbtn} onClick={onRecheck}>
          <Check size={14} strokeWidth={1.8} />
          Re-check thread
        </button>
      </div>

      {verified ? (
        <div className={styles.verify}>
          <Check size={15} strokeWidth={1.9} />
          Thread repaired — dangling call cleared, <span className="mono">interrupted</span> reset
          to false. Status is now healthy.
        </div>
      ) : null}
    </div>
  )
}
