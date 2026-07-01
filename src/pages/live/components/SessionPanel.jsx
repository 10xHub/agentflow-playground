import { useState } from "react"

import {
  MODALITIES,
  MODELS,
  SYSTEM_PROMPT,
  THREADS,
  TIMELINE,
  VAD_MODES,
  VAD_SILENCE,
  VOICES,
} from "../data"
import styles from "../live.module.css"

const TABS = [
  { id: "config", label: "Session" },
  { id: "timeline", label: "Timeline" },
]

function ConfigPane() {
  const [modalities, setModalities] = useState(
    () => new Set(MODALITIES.filter((m) => m.on).map((m) => m.name))
  )

  const toggleModality = (name) =>
    setModalities((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  return (
    <div>
      <div className={styles.fld}>
        <label>Model</label>
        <select className={styles.sel}>
          {MODELS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className={styles.fld}>
        <label>Voice</label>
        <select className={styles.sel}>
          {VOICES.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </div>

      <div className={styles.fld}>
        <label>Modalities</label>
        <div className={styles.chips}>
          {MODALITIES.map((m) => (
            <span
              key={m.name}
              className={`${styles.chip} ${modalities.has(m.name) ? styles.on : ""}`}
              onClick={() => toggleModality(m.name)}
            >
              <span className={styles.cx} />
              {m.name}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.fld}>
        <label>Turn detection · VAD</label>
        <div className={styles.vadGrid}>
          <select className={styles.sel}>
            {VAD_MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select className={styles.sel}>
            {VAD_SILENCE.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className={styles.hint}>threshold 0.5 · prefix_padding 300ms</div>
      </div>

      <div className={styles.fld}>
        <label>System prompt</label>
        <textarea className={styles.ta} rows={3} defaultValue={SYSTEM_PROMPT} />
      </div>

      <div className={styles.fld}>
        <label>Thread</label>
        <select className={styles.sel}>
          {THREADS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className={styles.sNote}>
        <b>Live-agent gated.</b> This surface is active only when the capability probe reports a
        live agent; otherwise the socket closes with code <span className="mono">1008</span>.
      </div>
    </div>
  )
}

function TimelinePane() {
  return (
    <div>
      <div className={styles.tlH}>Session events</div>
      <div className={styles.tl}>
        {TIMELINE.map((ev, i) => (
          <div key={i} className={`${styles.tlEv} ${ev.tone ? styles[ev.tone] : ""}`}>
            <div className={styles.tlTop}>
              <span className={styles.tlType}>{ev.type}</span>
              <span className={styles.tlTime}>{ev.time}</span>
            </div>
            <div className={styles.tlDetail}>{ev.detail}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Right session panel with Session (config) and Timeline (events) tabs. */
export default function SessionPanel() {
  const [tab, setTab] = useState("config")

  return (
    <aside className={styles.session}>
      <div className={styles.sTabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? styles.on : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={styles.sBody}>
        {tab === "config" ? <ConfigPane /> : <TimelinePane />}
      </div>
    </aside>
  )
}
