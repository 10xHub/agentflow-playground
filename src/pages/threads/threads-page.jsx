import {
  Activity,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  Trash2,
} from "lucide-react"
import PropTypes from "prop-types"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import ErrorNote from "@/components/shell/error-note"
import { ago } from "@/lib/format-ago"
import { track } from "@/lib/usage-events"
import { openServerThread } from "@/store/chat-history"
import { loadThread, loadThreadList, removeThread } from "@/store/threads-slice"

import MessagesPane from "./components/messages-pane"
import RawJson from "./components/raw-json"
import StatePane from "./components/state-pane"
import ThreadList from "./components/thread-list"
import styles from "./threads.module.css"

const TABS = [
  { key: "messages", label: "Messages" },
  { key: "state", label: "State & checkpoint" },
  { key: "raw", label: "Raw JSON" },
]

const threadShape = PropTypes.shape({
  thread_id: PropTypes.string,
  thread_name: PropTypes.string,
  user_id: PropTypes.string,
  updated_at: PropTypes.string,
})

const detailShape = PropTypes.shape({
  state: PropTypes.object,
  messages: PropTypes.array,
})

// Loaded count; "+" when the API may hold more pages.
const messageCount = (detail) => {
  if (!detail?.messages) return "—"
  return `${detail.messages.length}${detail.messagesHasMore ? "+" : ""}`
}

// id / user / message-count / updated summary line.
/**
 *
 */
const ThreadMeta = ({ thread = null, selectedId, detail = null }) => (
  <div className={styles.dMeta}>
    <span>
      <b>id</b> {selectedId?.slice(0, 12)}…
    </span>
    <span>
      <b>user</b> {thread?.user_id || "—"}
    </span>
    <span>
      <b>messages</b> {messageCount(detail)}
    </span>
    <span>
      <b>updated</b> {ago(thread?.updated_at)}
    </span>
  </div>
)

ThreadMeta.propTypes = {
  thread: threadShape,
  selectedId: PropTypes.string.isRequired,
  detail: detailShape,
}

// Refresh + two-step delete actions.
/**
 *
 */
const Toolbar = ({
  busy,
  delArmed,
  onRefresh,
  onDelete,
  onOpenChat,
  onViewTrace,
}) => (
  <div className={styles.toolbar}>
    <button
      type="button"
      className={styles.tbtn}
      onClick={onOpenChat}
      disabled={busy}
    >
      <MessageSquare size={14} strokeWidth={1.8} />
      Open in Chat
    </button>
    <div className={styles.tbSep} />
    <button
      type="button"
      className={styles.tbtn}
      onClick={onViewTrace}
      disabled={busy}
    >
      <Activity size={14} strokeWidth={1.8} />
      View trace
    </button>
    <div className={styles.tbSep} />
    <button
      type="button"
      className={styles.tbtn}
      onClick={onRefresh}
      disabled={busy}
    >
      <RefreshCw size={14} strokeWidth={1.8} />
      Refresh
    </button>
    <div className={styles.tbSep} />
    <button
      type="button"
      className={`${styles.tbtn} ${styles.danger} ${delArmed ? styles.armed : ""}`}
      onClick={onDelete}
      disabled={busy}
    >
      {delArmed ? (
        <>
          <AlertTriangle size={14} strokeWidth={1.8} />
          Confirm delete?
        </>
      ) : (
        <>
          <Trash2 size={14} strokeWidth={1.7} />
          Delete thread
        </>
      )}
    </button>
  </div>
)

Toolbar.propTypes = {
  busy: PropTypes.bool.isRequired,
  delArmed: PropTypes.bool.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onOpenChat: PropTypes.func.isRequired,
  onViewTrace: PropTypes.func.isRequired,
}

// Body for the active tab.
/**
 *
 */
const TabBody = ({ tab, thread = null, detail = null }) => (
  <div className={styles.dBody}>
    {tab === "messages" && <MessagesPane />}
    {tab === "state" && <StatePane />}
    {tab === "raw" && (
      <RawJson
        value={{
          thread,
          state: detail?.state,
          messages: detail?.messages,
        }}
      />
    )}
  </div>
)

TabBody.propTypes = {
  tab: PropTypes.string.isRequired,
  thread: threadShape,
  detail: detailShape,
}

/**
 *
 */
const ThreadsPage = () => {
  const dispatch = useDispatch()
  const { list, selectedId, detail, busy, detailError } = useSelector(
    (s) => s.threads
  )
  const [tab, setTab] = useState("messages")
  const [delArmed, setDelArmed] = useState(false)
  const navigate = useNavigate()

  // Load the thread list on mount.
  useEffect(() => {
    dispatch(loadThreadList())
  }, [dispatch])

  const thread = list.find((t) => t.thread_id === selectedId)

  const selectThread = (id) => {
    dispatch(loadThread(id))
    setTab("messages")
    setDelArmed(false)
  }

  // Load the thread's history into Chat and go there.
  const openInChat = async () => {
    const opened = await dispatch(
      openServerThread(selectedId, { title: thread?.thread_name })
    )
    if (opened) navigate("/chat")
  }

  // Two-step delete guard.
  const onDelete = () => {
    if (!selectedId) return
    if (delArmed) {
      dispatch(removeThread(selectedId))
      track("thread_deleted", { source: "threads_page" })
      setDelArmed(false)
      return
    }
    setDelArmed(true)
  }

  return (
    <div className={styles.page}>
      <ThreadList selectedId={selectedId} onSelect={selectThread} />

      <section className={styles.detail}>
        {!selectedId ? (
          <div className={styles.paneEmpty} style={{ margin: "auto" }}>
            Select a thread to inspect it.
          </div>
        ) : (
          <>
            <div className={styles.dHead}>
              <div className={styles.dTop}>
                <span className={styles.dId}>
                  {thread?.thread_name || selectedId}
                </span>
              </div>
              <ThreadMeta
                thread={thread}
                selectedId={selectedId}
                detail={detail}
              />

              <Toolbar
                busy={busy}
                delArmed={delArmed}
                onRefresh={() => dispatch(loadThread(selectedId))}
                onDelete={onDelete}
                onOpenChat={openInChat}
                onViewTrace={() =>
                  navigate(`/trace?thread=${encodeURIComponent(selectedId)}`)
                }
              />

              <div className={styles.tabs}>
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`${styles.tab} ${tab === t.key ? styles.on : ""}`}
                    onClick={() => setTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {detailError && (
              <ErrorNote
                message={detailError}
                onRetry={() => dispatch(loadThread(selectedId))}
              />
            )}
            <TabBody tab={tab} thread={thread} detail={detail} />
          </>
        )}
      </section>
    </div>
  )
}

export default ThreadsPage
