import { Check, Search, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useDispatch } from "react-redux"

import { forgetVisible, searchMemories } from "@/store/memorySlice"

import { DISTANCE_METRICS, RETRIEVAL_STRATEGIES } from "../data"
import styles from "../memory.module.css"

/**
 *
 */
export default function MemoryList({
  mode,
  onSetMode,
  strategy,
  onSetStrategy,
  metric,
  onSetMetric,
  cat,
  list,
  total,
  status,
  error,
  query,
  activeId,
  onSelect,
}) {
  const dispatch = useDispatch()
  const [forgetArmed, setForgetArmed] = useState(false)
  const [browseFilter, setBrowseFilter] = useState("")
  const [searchInput, setSearchInput] = useState(query || "")
  const search = mode === "search"

  useEffect(() => setSearchInput(query || ""), [query])

  const runSearch = () => {
    if (searchInput.trim()) dispatch(searchMemories(searchInput.trim()))
  }

  const confirmForget = () => {
    if (forgetArmed) {
      dispatch(forgetVisible())
      setForgetArmed(false)
    } else {
      setForgetArmed(true)
    }
  }

  // Browse mode does an extra client-side text filter over the loaded rows.
  const shown = search
    ? list
    : browseFilter.trim()
      ? list.filter((m) =>
          m.content.toLowerCase().includes(browseFilter.toLowerCase())
        )
      : list

  const subLabel = search
    ? `${shown.length} results · scored by ${strategy}`
    : `${shown.length} of ${total} loaded${cat ? ` · ${cat}` : ""}`

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
          <button
            className={mode === "search" ? styles.on : ""}
            onClick={() => onSetMode("search")}
          >
            Search
          </button>
        </div>

        {mode === "browse" ? (
          <div className={styles.search}>
            <Search size={14} strokeWidth={1.7} />
            <input
              placeholder="Filter loaded memories by content…"
              spellCheck={false}
              value={browseFilter}
              onChange={(e) => setBrowseFilter(e.target.value)}
            />
          </div>
        ) : (
          <>
            <div className={styles.search}>
              <Search size={14} strokeWidth={1.7} />
              <input
                placeholder="Semantic query… (press Enter)"
                spellCheck={false}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
              />
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
          disabled={!shown.length}
        >
          {forgetArmed ? (
            <Check size={12} strokeWidth={1.8} />
          ) : (
            <Trash2 size={12} strokeWidth={1.7} />
          )}
          {forgetArmed ? `Confirm · forget ${shown.length}?` : "Forget visible"}
        </button>
      </div>

      <div className={styles.rows}>
        {status === "loading" && (
          <div className={styles.memEmpty}>Loading memories…</div>
        )}
        {status === "error" && <div className={styles.memEmpty}>{error}</div>}
        {status === "ready" && shown.length === 0 && (
          <div className={styles.memEmpty}>
            {search
              ? "No results — try another query."
              : "No memories in this collection."}
          </div>
        )}
        {shown.map((m) => (
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
    </section>
  )
}
