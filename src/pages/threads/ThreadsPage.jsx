import { AlertTriangle, Check, Eraser, Pencil, RotateCcw, Square, Trash2 } from "lucide-react"
import { useState } from "react"

import { RAW_JSON, THREADS } from "./data"
import JsonBlock from "./components/JsonBlock"
import MessagesPane from "./components/MessagesPane"
import StatePane from "./components/StatePane"
import ThreadList from "./components/ThreadList"
import styles from "./threads.module.css"

const TABS = [
  { key: "messages", label: "Messages" },
  { key: "state", label: "State & checkpoint" },
  { key: "raw", label: "Raw JSON" },
]

function ThreadsPage() {
  const [selectedId, setSelectedId] = useState(THREADS[0].fullId)
  const [tab, setTab] = useState("messages")
  const [delArmed, setDelArmed] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [verified, setVerified] = useState(false)

  const thread = THREADS.find((t) => t.fullId === selectedId) || THREADS[0]

  // Selecting a different thread resets the transient repair states.
  const selectThread = (id) => {
    setSelectedId(id)
    setTab("messages")
    setDelArmed(false)
    setDeleted(false)
    setVerified(false)
  }

  // Two-step delete guard: first click arms, second confirms.
  const onDelete = () => {
    if (delArmed) {
      setDeleted(true)
      return
    }
    setDelArmed(true)
  }

  // Fix thread: jump to the State tab and reveal the verify toast.
  const onFix = () => {
    setTab("state")
    setVerified(true)
  }

  return (
    <div className={styles.page}>
      <ThreadList selectedId={selectedId} onSelect={selectThread} />

      <section className={styles.detail}>
        <div className={styles.dHead}>
          <div className={styles.dTop}>
            <span className={styles.dId}>{thread.fullId}</span>
            <span className={`${styles.st} ${styles[thread.status]}`}>
              <span className={styles.sd} />
              {thread.status}
            </span>
          </div>
          <div className={styles.dMeta}>
            <span>
              <b>user</b> {thread.user}
            </span>
            <span>
              <b>messages</b> {thread.msgs}
            </span>
            <span>
              <b>created</b> {thread.created}
            </span>
            <span>
              <b>last active</b> {thread.lastActive}
            </span>
            <span>
              <b>agent</b> {thread.agent}
            </span>
          </div>

          <div className={styles.toolbar}>
            <button type="button" className={`${styles.tbtn} ${styles.primary}`} onClick={onFix}>
              <RotateCcw size={14} strokeWidth={1.8} />
              Fix thread
            </button>
            <button type="button" className={styles.tbtn}>
              <Square size={14} strokeWidth={1.8} />
              Stop
            </button>
            <div className={styles.tbSep} />
            <button type="button" className={styles.tbtn}>
              <Pencil size={14} strokeWidth={1.7} />
              Edit state
            </button>
            <button type="button" className={styles.tbtn}>
              <Eraser size={14} strokeWidth={1.7} />
              Clear state
            </button>
            <div className={styles.tbSep} />
            <button
              type="button"
              className={`${styles.tbtn} ${styles.danger} ${delArmed ? styles.armed : ""}`}
              onClick={onDelete}
            >
              {deleted ? (
                <>
                  <Check size={14} strokeWidth={1.8} />
                  Deleted
                </>
              ) : delArmed ? (
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
          {tab === "state" && (
            <StatePane verified={verified} onRecheck={() => setTab("messages")} />
          )}
          {tab === "raw" && <JsonBlock lines={RAW_JSON} />}
        </div>
      </section>
    </div>
  )
}

export default ThreadsPage
