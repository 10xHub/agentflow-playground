import { Check, ChevronDown, Search, Trash2 } from "lucide-react"
import { useState } from "react"

import { DISTANCE_METRICS, RETRIEVAL_STRATEGIES, SCOPE } from "../data"
import styles from "../memory.module.css"

export default function MemoryList({
  mode,
  onSetMode,
  strategy,
  onSetStrategy,
  metric,
  onSetMetric,
  cat,
  list,
  activeId,
  onSelect,
}) {
  const [forgetArmed, setForgetArmed] = useState(false)
  const search = mode === "search"

  const confirmForget = () => setForgetArmed((a) => !a)

  const subLabel = search
    ? `${list.length} results · scored by ${strategy}`
    : `${list.length} of ${SCOPE.total} loaded${cat ? ` · ${cat}` : ""}`

  return (
    <section className={styles.list}>
      <div className={styles.listHead}>
        <div className={styles.modeseg}>
          <button
            className={mode === "browse" ? styles.on : ""}
            onClick={() => onSetMode("browse")}
          >
            Browse loaded
          </button>
          <button className={mode === "search" ? styles.on : ""} onClick={() => onSetMode("search")}>
            Search
          </button>
        </div>

        {mode === "browse" ? (
          <div className={styles.search}>
            <Search size={14} strokeWidth={1.7} />
            <input placeholder="Filter loaded memories by content…" spellCheck={false} />
          </div>
        ) : (
          <>
            <div className={styles.search}>
              <Search size={14} strokeWidth={1.7} />
              <input defaultValue="what does the user like to drink" spellCheck={false} />
            </div>
            <div className={styles.row2}>
              <select
                className={styles.sel}
                title="retrieval_strategy"
                value={strategy}
                onChange={(e) => onSetStrategy(e.target.value)}
              >
                {RETRIEVAL_STRATEGIES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                className={styles.sel}
                title="distance_metric"
                value={metric}
                onChange={(e) => onSetMetric(e.target.value)}
              >
                {DISTANCE_METRICS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      <div className={styles.listSub}>
        <span>{subLabel}</span>
        <button
          className={`${styles.forget} ${forgetArmed ? styles.armed : ""}`}
          onClick={confirmForget}
        >
          {forgetArmed ? <Check size={12} strokeWidth={1.8} /> : <Trash2 size={12} strokeWidth={1.7} />}
          {forgetArmed ? `Confirm · forget ${list.length}?` : "Forget filtered"}
        </button>
      </div>

      <div className={styles.rows}>
        {list.map((m) => (
          <div
            key={m.id}
            className={`${styles.mrow} ${m.id === activeId ? styles.active : ""}`}
            onClick={() => onSelect(m.id)}
          >
            <div className={styles.mrowTop}>
              <span className={styles.tbadge}>
                <span className={`${styles.fd} ${styles[m.type]}`} />
                {m.type}
              </span>
              {search && (
                <span className={styles.mrowScore}>
                  <span className={styles.bar}>
                    <i style={{ width: `${Math.round(m.score * 100)}%` }} />
                  </span>
                  <span className={styles.n}>{m.score.toFixed(2)}</span>
                </span>
              )}
            </div>
            <div className={styles.mrowText}>{m.content}</div>
            <div className={styles.mrowMeta}>
              {m.meta.memory_key && (
                <>
                  <span className={styles.mk}>{m.meta.memory_key}</span>
                  <span>·</span>
                </>
              )}
              <span>{m.cat}</span>
              <span>· {m.ts.split(" ")[0]}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.pager}>
        <span>
          {SCOPE.total} of {SCOPE.total} loaded
        </span>
        <button className={styles.loadmore}>
          <ChevronDown size={12} strokeWidth={1.8} />
          Load 100 more
        </button>
      </div>
    </section>
  )
}
