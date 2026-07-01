import { X } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { CURL, EVENTS, FRAMES, THREAD, TRAJECTORY } from "../data"
import styles from "../chat.module.css"

const TABS = ["events", "graph", "frames", "curl"]
const TAB_LABEL = { events: "Events", graph: "Graph", frames: "Frames", curl: "cURL" }

function EventsPane() {
  return (
    <>
      {EVENTS.map((e, i) => (
        <div className={styles.ev} key={i}>
          <div className={styles.evH}>
            <span className={`${styles.evType} ${styles[e.type]}`}>{e.type}</span>
            <span className={styles.evNode}>{e.node}</span>
            <span className={styles.evTime}>{e.time}</span>
          </div>
          <div className={styles.evDetail}>{e.detail}</div>
        </div>
      ))}
    </>
  )
}

function TrajectoryPane() {
  return (
    <>
      <div className={styles.trajHead}>
        <span>Current run · path</span>
        <span className={styles.tjThread}>{THREAD.id}</span>
      </div>
      <div className={styles.traj}>
        {TRAJECTORY.map((s, i) => (
          <div key={i} className={`${styles.tstep} ${styles[s.state]}`}>
            <span className={styles.tdot} />
            <div className={styles.tinfo}>
              <span className={styles.tname}>{s.name}</span>
              <span className={styles.tmeta}>{s.meta}</span>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.trajNote}>
        Path is derived live from <span className={styles.hl}>updates</span> events (
        <span className={styles.hl}>data.node · data.step</span>). Open the{" "}
        <Link to="/graph">Graph page</Link> for the full structure, tools and state schema.
      </div>
    </>
  )
}

function FramesPane() {
  return (
    <>
      {FRAMES.map((f, i) => (
        <div className={styles.frame} key={i}>
          <div className={styles.fh}>
            <span className={`${styles.fdir} ${styles[f.dir]}`}>
              {f.dir === "out" ? "▲ send" : "▼ sse"}
            </span>
            {f.label}
            <span className={styles.ft}>{f.time}</span>
          </div>
        </div>
      ))}
    </>
  )
}

export default function Inspector({ onClose }) {
  const [tab, setTab] = useState("events")

  return (
    <aside className={styles.inspector}>
      <div className={styles.inspHead}>
        <span className={styles.inspTitle}>Request Inspector</span>
        <div className={styles.inspTabs}>
          {TABS.map((t) => (
            <button key={t} className={tab === t ? styles.on : ""} onClick={() => setTab(t)}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
        <button className={styles.inspClose} onClick={onClose} title="Close inspector">
          <X size={14} />
        </button>
      </div>
      <div className={styles.inspBody}>
        {tab === "events" && <EventsPane />}
        {tab === "graph" && <TrajectoryPane />}
        {tab === "frames" && <FramesPane />}
        {tab === "curl" && <div className={styles.curlbox}>{CURL}</div>}
      </div>
    </aside>
  )
}
