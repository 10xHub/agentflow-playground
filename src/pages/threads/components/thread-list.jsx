import { RefreshCw, Search } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { loadThreadList } from "@/store/threads-slice"

import styles from "../threads.module.css"

// "3m ago" style relative time from an ISO/timestamp string.
const ago = (iso) => {
  if (!iso) return "—"
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return "—"
  const s = Math.max(0, (Date.now() - then) / 1000)
  if (s < 60) return "now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const shortId = (id) =>
  id?.length > 12 ? `${id.slice(0, 8)}…${id.slice(-3)}` : id

// Keyboard equivalent of the row click (Enter / Space activate).
const activateOnKey = (handler) => (e) => {
  if (e.key !== "Enter" && e.key !== " ") return
  e.preventDefault()
  handler()
}

/**
 *
 */
const ThreadList = ({ selectedId = null, onSelect }) => {
  const dispatch = useDispatch()
  const { list, listStatus, listError } = useSelector((s) => s.threads)
  const [query, setQuery] = useState("")

  const rows = list.filter((t) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      t.thread_id?.toLowerCase().includes(q) ||
      t.thread_name?.toLowerCase().includes(q) ||
      t.user_id?.toLowerCase().includes(q)
    )
  })

  return (
    <section className={styles.list}>
      <div className={styles.listHead}>
        <div className={styles.listTitle}>
          <h2>Threads</h2>
          <span className={styles.cnt}>
            {listStatus === "loading" ? "loading…" : `${list.length} readable`}
          </span>
          <button
            type="button"
            className={styles.refreshBtn}
            title="Refresh"
            onClick={() => dispatch(loadThreadList())}
          >
            <RefreshCw size={13} strokeWidth={1.8} />
          </button>
        </div>
        <div className={styles.search}>
          <Search size={14} strokeWidth={1.7} />
          <input
            placeholder="Search id, name, user…"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.rows}>
        {listStatus === "error" && (
          <div className={styles.listEmpty}>{listError}</div>
        )}
        {listStatus === "ready" && rows.length === 0 && (
          <div className={styles.listEmpty}>
            {query
              ? "No threads match."
              : "No threads yet — start a chat to create one."}
          </div>
        )}
        {rows.map((t) => (
          <div
            key={t.thread_id}
            className={`${styles.row} ${selectedId === t.thread_id ? styles.active : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(t.thread_id)}
            onKeyDown={activateOnKey(() => onSelect(t.thread_id))}
          >
            <div className={styles.rowTop}>
              <span className={styles.rowId}>
                {t.thread_name || shortId(t.thread_id)}
              </span>
            </div>
            <div className={styles.rowMeta}>
              <span className={styles.u}>{t.user_id || "no user"}</span>
              <span>· {shortId(t.thread_id)}</span>
              <span>· {ago(t.updated_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

ThreadList.propTypes = {
  selectedId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
}

export default ThreadList
