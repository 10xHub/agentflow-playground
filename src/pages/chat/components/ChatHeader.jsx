import { ChevronDown, RotateCcw, Square } from "lucide-react"
import { useState } from "react"

import { THREAD } from "../data"
import styles from "../chat.module.css"

const MODES = ["invoke", "stream", "ws"]

export default function ChatHeader() {
  const [mode, setMode] = useState("stream")

  return (
    <div className={styles.head}>
      <button className={styles.threadPick} type="button">
        <span className={`${styles.dot} ${THREAD.live ? styles.live : ""}`} />
        <span className={styles.tLabel}>{THREAD.label}</span>
        <span className={styles.tId}>{THREAD.id}</span>
        <ChevronDown size={12} className={styles.chev} />
      </button>

      <div className={styles.seg} role="tablist">
        {MODES.map((m) => (
          <button key={m} className={mode === m ? styles.on : ""} onClick={() => setMode(m)}>
            {m}
          </button>
        ))}
      </div>

      <select className={styles.miniSelect} title="response_granularity" defaultValue="partial">
        <option value="full">full</option>
        <option value="partial">partial</option>
        <option value="low">low</option>
      </select>

      <div className={styles.headRight}>
        <button className={`${styles.btnGhostSm} ${styles.danger}`} type="button">
          <Square size={13} />
          Stop
        </button>
        <button className={styles.btnGhostSm} type="button">
          <RotateCcw size={13} />
          Fix thread
        </button>
      </div>
    </div>
  )
}
