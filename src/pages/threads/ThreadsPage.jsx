import { AlertTriangle, Check, RefreshCw, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { loadThread, loadThreadList, removeThread } from "@/store/threadsSlice"

import MessagesPane from "./components/MessagesPane"
import StatePane from "./components/StatePane"
import ThreadList from "./components/ThreadList"
import styles from "./threads.module.css"

const TABS = [
  { key: "messages", label: "Messages" },
  { key: "state", label: "State & checkpoint" },
  { key: "raw", label: "Raw JSON" },
]

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

export default function ThreadsPage() {
  const dispatch = useDispatch()
  const { list, selectedId, detail, busy } = useSelector((s) => s.threads)
  const [tab, setTab] = useState("messages")
  const [delArmed, setDelArmed] = useState(false)

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

  // Two-step delete guard.
  const onDelete = () => {
    if (!selectedId) return
    if (delArmed) {
      dispatch(removeThread(selectedId))
      setDelArmed(false)
      return
    }
    setDelArmed(true)
  }

  const msgCount = detail?.messages?.length ?? "—"

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
                <span className={styles.dId}>{thread?.thread_name || selectedId}</span>
              </div>
              <div className={styles.dMeta}>
                <span>
                  <b>id</b> {selectedId?.slice(0, 12)}…
                </span>
                <span>
                  <b>user</b> {thread?.user_id || "—"}
                </span>
                <span>
                  <b>messages</b> {msgCount}
                </span>
                <span>
                  <b>updated</b> {ago(thread?.updated_at)}
                </span>
              </div>

              <div className={styles.toolbar}>
                <button
                  type="button"
                  className={styles.tbtn}
                  onClick={() => dispatch(loadThread(selectedId))}
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

            <div className={styles.dBody}>
              {tab === "messages" && <MessagesPane />}
              {tab === "state" && <StatePane />}
              {tab === "raw" && (
                <pre className={styles.rawState}>
                  {JSON.stringify({ thread, state: detail?.state, messages: detail?.messages }, null, 2)}
                </pre>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
