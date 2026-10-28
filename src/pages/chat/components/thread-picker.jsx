import { ChevronDown, Plus, Trash2 } from "lucide-react"
import PropTypes from "prop-types"
import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { ago } from "@/lib/format-ago"
import { getTenxGraphClient } from "@/lib/tenxgraph-client"
import { track } from "@/lib/usage-events"
import { openServerThread } from "@/store/chat-history"
import {
  DRAFT_ID,
  newThread,
  removeThread,
  switchThread,
} from "@/store/chat-slice"
import { THREAD_PAGE } from "@/store/threads-slice"

import styles from "../chat.module.css"

const SEARCH_DELAY_MS = 300

const threadsOf = (res) => (res?.data || res)?.threads || []

// Trust the server's has_more; only an older server (no flag) falls back to
// guessing from a full page.
const hasMoreOf = (res, list) => {
  const flag = (res?.data || res)?.has_more
  return typeof flag === "boolean" ? flag : list.length >= THREAD_PAGE
}

const pageOf = (search, offset) => ({
  ...(search ? { search } : {}),
  offset,
  limit: THREAD_PAGE,
})

const shortId = (id) => (id === DRAFT_ID ? "draft" : id.slice(0, 8))

/**
 * Picker rows: the server's threads first, then threads only this browser knows
 * (a new thread the server has not listed yet, the draft). While searching, only
 * server matches show.
 */
export const buildRows = ({ serverList, order, byId, searching }) => {
  const rows = serverList.map((t) => ({
    id: t.thread_id,
    title: t.thread_name || byId[t.thread_id]?.title || shortId(t.thread_id),
    updatedAt: t.updated_at,
    cached: Boolean(byId[t.thread_id]),
  }))
  if (searching) return rows
  const listed = new Set(rows.map((r) => r.id))
  const local = order
    .filter((id) => byId[id] && !listed.has(id))
    .map((id) => ({ id, title: byId[id].title, updatedAt: null, cached: true }))
  return [...local, ...rows]
}

const ThreadRow = ({ row, active, onPick }) => {
  const dispatch = useDispatch()
  return (
    <div
      className={`${styles.threadItem} ${active ? styles.threadActive : ""}`}
    >
      <button
        className={styles.threadItemMain}
        type="button"
        onClick={() => onPick(row.id)}
      >
        <span className={styles.threadItemTitle}>{row.title}</span>
        <span className={styles.threadItemId}>
          {shortId(row.id)}
          {row.updatedAt ? ` · ${ago(row.updatedAt)}` : ""}
          {row.id !== DRAFT_ID && !row.updatedAt ? " · not on server yet" : ""}
        </span>
      </button>
      {row.cached && (
        <button
          className={styles.threadDel}
          type="button"
          title="Remove from this browser's cache (does not delete the thread on the server)"
          aria-label="Remove from cache"
          onClick={() => {
            dispatch(removeThread(row.id))
            track("thread_deleted", { source: "chat_header" })
          }}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

ThreadRow.propTypes = {
  row: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    updatedAt: PropTypes.string,
    cached: PropTypes.bool,
  }).isRequired,
  active: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
}

// The picker's own server list (search, paging), separate from the Threads
// page's list in the store so neither overwrites the other.
const useServerThreads = (query) => {
  const [state, setState] = useState({
    list: [],
    status: "loading",
    error: null,
    hasMore: false,
    loadingMore: false,
  })
  const term = query.trim()

  useEffect(() => {
    let live = true
    const wait = term ? SEARCH_DELAY_MS : 0
    const timer = setTimeout(async () => {
      try {
        const res = await getTenxGraphClient().threads(pageOf(term, 0))
        const list = threadsOf(res)
        if (live) {
          setState({
            list,
            status: "ready",
            error: null,
            hasMore: hasMoreOf(res, list),
            loadingMore: false,
          })
        }
      } catch (e) {
        if (live) {
          setState((s) => ({
            ...s,
            status: "error",
            error: e?.message || "Failed to load threads",
          }))
        }
      }
    }, wait)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [term])

  const loadMore = async () => {
    setState((s) => ({ ...s, loadingMore: true }))
    try {
      const res = await getTenxGraphClient().threads(
        pageOf(term, state.list.length)
      )
      const more = threadsOf(res)
      setState((s) => {
        const seen = new Set(s.list.map((t) => t.thread_id))
        return {
          ...s,
          list: [...s.list, ...more.filter((t) => !seen.has(t.thread_id))],
          hasMore: hasMoreOf(res, more),
          loadingMore: false,
        }
      })
    } catch {
      setState((s) => ({ ...s, loadingMore: false }))
    }
  }

  return { ...state, loadMore }
}

const ThreadMenu = ({ activeKey, onClose }) => {
  const dispatch = useDispatch()
  const generating = useSelector((s) => s.chat.generating)
  const { order, byId } = useSelector((s) => s.chat.threads)
  const [query, setQuery] = useState("")
  const server = useServerThreads(query)
  const { list, hasMore, loadingMore } = server
  const listStatus = server.status
  const listError = server.error

  const searching = Boolean(query.trim())
  const rows = buildRows({ serverList: list, order, byId, searching })

  const pick = (id) => {
    onClose()
    dispatch(id === DRAFT_ID ? switchThread(id) : openServerThread(id))
  }

  return (
    <div className={styles.threadMenu}>
      <button
        className={styles.threadNew}
        type="button"
        onClick={() => {
          dispatch(newThread())
          track("thread_created")
          onClose()
        }}
        disabled={generating}
      >
        <Plus size={13} /> New thread
      </button>
      <input
        className={styles.threadSearch}
        placeholder="Search threads…"
        spellCheck={false}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className={styles.threadList}>
        {listError && listStatus === "error" && (
          <div className={styles.threadEmpty}>
            Could not reach the server ({listError}). Showing this
            browser&apos;s cache.
          </div>
        )}
        {rows.length === 0 && listStatus !== "loading" && (
          <div className={styles.threadEmpty}>
            {searching ? "No threads match." : "No threads yet."}
          </div>
        )}
        {rows.map((row) => (
          <ThreadRow
            key={row.id}
            row={row}
            active={row.id === activeKey}
            onPick={pick}
          />
        ))}
        {hasMore && (
          <button
            className={styles.threadMore}
            type="button"
            disabled={loadingMore}
            onClick={server.loadMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  )
}

ThreadMenu.propTypes = {
  activeKey: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
}

/**
 *
 */
const ThreadPicker = () => {
  const threadId = useSelector((s) => s.chat.threadId)
  const byId = useSelector((s) => s.chat.threads.byId)
  const [open, setOpen] = useState(false)
  const reference = useRef(null)

  // Close on outside click.
  useEffect(() => {
    if (!open) return undefined
    const onDocument = (e) => {
      if (reference.current && !reference.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocument)
    return () => document.removeEventListener("mousedown", onDocument)
  }, [open])

  const activeKey = threadId || DRAFT_ID

  return (
    <div className={styles.threadWrap} ref={reference}>
      <button
        className={styles.threadPick}
        type="button"
        title="Switch thread"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`${styles.dot} ${threadId ? styles.live : ""}`} />
        <span className={styles.tLabel}>
          {byId[activeKey]?.title || "New thread"}
        </span>
        <span className={styles.tId}>
          {threadId ? threadId.slice(0, 8) : "unassigned"}
        </span>
        <ChevronDown size={12} className={styles.chev} />
      </button>
      {open && (
        <ThreadMenu activeKey={activeKey} onClose={() => setOpen(false)} />
      )}
    </div>
  )
}

export default ThreadPicker
