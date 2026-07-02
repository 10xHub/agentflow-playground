import { ChevronDown, ExternalLink } from "lucide-react"

import styles from "../observability.module.css"

const TABS = [
  { id: "trace", label: "Trace timeline" },
  { id: "events", label: "Events" },
  { id: "cost", label: "Cost & tokens" },
]

// Deep-links to external tracing backends (surfaced but not configured here).
const DEEP_LINKS = [
  { id: "logfire", label: "Logfire · off", off: true },
  { id: "langsmith", label: "LangSmith · off", off: true },
  { id: "jaeger", label: "Jaeger · off", off: true },
]

const shortId = (id) =>
  !id ? "—" : id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id

export default function ObsHeader({ tab, onTab, threadId, stats, runCount }) {
  return (
    <div className={styles.obsHead}>
      <div className={styles.ohTop}>
        <span className={styles.ohTitle}>Observability</span>

        <div className={styles.scope}>
          scope <b>thread</b> · {shortId(threadId)}
          <ChevronDown size={12} className={styles.chev} />
        </div>

        <div className={styles.runPick}>
          {runCount ? `latest of ${runCount}` : "no runs"}
          <ChevronDown size={12} className={styles.chev} />
        </div>

        <div className={styles.ohLinks}>
          {DEEP_LINKS.map((d) => (
            <button
              key={d.id}
              className={`${styles.dl} ${d.off ? styles.off : ""}`}
              type="button"
              title={d.off ? "Not configured for this connection" : undefined}
            >
              {!d.off && <ExternalLink size={13} strokeWidth={1.7} />}
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.stats}>
        {(stats || []).map((s) => (
          <div className={styles.stat} key={s.label}>
            <div className={styles.sl}>{s.label}</div>
            <div className={`${styles.sv} ${s.accent ? styles.accent : ""}`}>
              {s.value}
              {s.small && <small>{s.small}</small>}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.on : ""}`}
            onClick={() => onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
