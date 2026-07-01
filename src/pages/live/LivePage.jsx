import { useState } from "react"

import SessionPanel from "./components/SessionPanel"
import Stage from "./components/Stage"
import Transcript from "./components/Transcript"
import { SESSION } from "./data"
import styles from "./live.module.css"

export function LivePage() {
  const [muted, setMuted] = useState(false)

  return (
    <>
      <div className={styles.main}>
        <div className={styles.liveHead}>
          <div className={styles.lhTitle}>
            Live session <span className={styles.sub}>{SESSION.agent}</span>
          </div>
          <div className={styles.health}>
            <span className={styles.hdot} />
            {SESSION.status}
          </div>
          <span className={styles.timer}>{SESSION.timer}</span>
          <div className={styles.headRight}>
            <span className={styles.rate}>{SESSION.rate}</span>
          </div>
        </div>

        <Stage muted={muted} onToggleMute={() => setMuted((m) => !m)} />
        <Transcript />
      </div>

      <SessionPanel />
    </>
  )
}

export default LivePage
