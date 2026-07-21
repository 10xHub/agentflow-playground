import { Search } from "lucide-react"
import { useState } from "react"

import styles from "../observability.module.css"

const EVENT_CHIPS = ["all", "message", "updates", "state", "error"]

/**
 *
 */
export default function EventsPane({ events, selectedId, onSelect }) {
  const [chip, setChip] = useState("all")
  const [query, setQuery] = useState("")

  const rows = (events || []).filter((e) => {
    if (chip !== "all" && e.type !== chip) return false
    if (
      query &&
      !`${e.node} ${e.summary} ${e.type}`
        .toLowerCase()
        .includes(query.toLowerCase())
    ) {
      return false
    }
    return true
  })

  return (
    <div>
      <div className={styles.evControls}>
        <div className={styles.evSearch}>
          <Search size={14} strokeWidth={1.7} />
          <input
            placeholder="Search events…"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className={styles.evChips}>
          {EVENT_CHIPS.map((c) => (
            <button
              key={c}
              className={`${styles.ec} ${chip === c ? styles.on : ""}`}
              onClick={() => setChip(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 && (
        <div className={styles.srcNote} style={{ marginTop: 16 }}>
          No events match.
        </div>
      )}

      {rows.map((e) => (
        <div
          key={e.id}
          className={`${styles.ev} ${selectedId === e.id ? styles.sel : ""}`}
          onClick={() => onSelect({ ...e, selType: "event" })}
        >
          <span className={styles.evT}>{e.time}</span>
          <span className={`${styles.evType} ${styles[e.type]}`}>{e.type}</span>
          <span className={styles.evNode}>{e.node}</span>
          <span className={styles.evSum}>{e.summary}</span>
        </div>
      ))}
    </div>
  )
}
