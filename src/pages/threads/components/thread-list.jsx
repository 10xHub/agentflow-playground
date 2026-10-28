import { RefreshCw, Search } from "lucide-react"
import PropTypes from "prop-types"
import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { ago } from "@/lib/format-ago"
import { loadMoreThreads, loadThreadList } from "@/store/threads-slice"

import styles from "../threads.module.css"

const SEARCH_DELAY_MS = 300

const shortId = (id) =>
  id?.length > 12 ? `${id.slice(0, 8)}…${id.slice(-3)}` : id

// The API returns no total, so say only what is loaded.
const countLabel = (n, hasMore) =>
  `${n} loaded${hasMore ? ", more available" : ""}`

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
  const { list, listStatus, listError, hasMore, loadingMore, search } =
    useSelector((s) => s.threads)
  const [query, setQuery] = useState(search)
  const skipFirst = useRef(true)

  // Search is server-side (GET /v1/threads?search=); debounce the keystrokes.
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false
      return undefined
    }
    const timer = setTimeout(
      () => dispatch(loadThreadList({ select: false, search: query })),
      SEARCH_DELAY_MS
    )
    return () => clearTimeout(timer)
  }, [dispatch, query])

  const rows = list

  return (
    <section className={styles.list}>
      <div className={styles.listHead}>
        <div className={styles.listTitle}>
          <h2>Threads</h2>
          <span className={styles.cnt}>
            {listStatus === "loading"
              ? "loading…"
              : countLabel(list.length, hasMore)}
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
            placeholder="Search threads…"
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
        {hasMore && (
          <button
            type="button"
            className={styles.refreshBtn}
            disabled={loadingMore}
            onClick={() => dispatch(loadMoreThreads())}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </section>
  )
}

ThreadList.propTypes = {
  selectedId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
}

export default ThreadList
