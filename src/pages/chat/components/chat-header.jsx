import { ChevronDown, Plus, RotateCcw, Square, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { track } from "@/lib/analytics"
import {
  newThread,
  removeThread,
  setGranularity,
  setMode,
  switchThread,
} from "@/store/chatSlice"
import { fixThread, stopGeneration } from "@/store/chatThunks"

import styles from "../chat.module.css"

// ws works via the local client but is gated "coming soon" until the client is
// published to npm (see README). Flip `soon:false` to enable it.
const MODES = [
  { id: "invoke", soon: false },
  { id: "stream", soon: false },
  { id: "ws", soon: true },
]

/**
 *
 */
const ThreadPicker = () => {
  const dispatch = useDispatch()
  const threadId = useSelector((s) => s.chat.threadId)
  const { order, byId } = useSelector((s) => s.chat.threads)
  const generating = useSelector((s) => s.chat.generating)
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

  const activeKey = threadId || "__draft__"
  const active = byId[activeKey]

  const pick = (id) => {
    dispatch(switchThread(id))
    setOpen(false)
  }

  return (
    <div className={styles.threadWrap} ref={reference}>
      <button
        className={styles.threadPick}
        type="button"
        title="Switch thread"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`${styles.dot} ${threadId ? styles.live : ""}`} />
        <span className={styles.tLabel}>{active?.title || "New thread"}</span>
        <span className={styles.tId}>
          {threadId ? threadId.slice(0, 8) : "unassigned"}
        </span>
        <ChevronDown size={12} className={styles.chev} />
      </button>

      {open && (
        <div className={styles.threadMenu}>
          <button
            className={styles.threadNew}
            type="button"
            onClick={() => {
              dispatch(newThread())
              track("thread_created")
              setOpen(false)
            }}
            disabled={generating}
          >
            <Plus size={13} /> New thread
          </button>

          <div className={styles.threadList}>
            {order.length === 0 ? (
              <div className={styles.threadEmpty}>No cached threads yet.</div>
            ) : (
              order.map((id) => {
                const t = byId[id]
                if (!t) return null
                return (
                  <div
                    key={id}
                    className={`${styles.threadItem} ${id === activeKey ? styles.threadActive : ""}`}
                  >
                    <button
                      className={styles.threadItemMain}
                      type="button"
                      onClick={() => pick(id)}
                    >
                      <span className={styles.threadItemTitle}>{t.title}</span>
                      <span className={styles.threadItemId}>
                        {id === "__draft__" ? "draft" : id.slice(0, 8)} ·{" "}
                        {t.messages.length} msg
                      </span>
                    </button>
                    <button
                      className={styles.threadDel}
                      type="button"
                      title="Remove from cache"
                      onClick={() => {
                        dispatch(removeThread(id))
                        track("thread_deleted", { source: "chat_header" })
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 *
 */
export default function ChatHeader() {
  const dispatch = useDispatch()
  const mode = useSelector((s) => s.chat.mode)
  const granularity = useSelector((s) => s.chat.granularity)
  const generating = useSelector((s) => s.chat.generating)
  const threadId = useSelector((s) => s.chat.threadId)

  return (
    <div className={styles.head}>
      <ThreadPicker />

      <div className={styles.seg} role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`${mode === m.id ? styles.on : ""} ${m.soon ? styles.soon : ""}`}
            onClick={() => !m.soon && dispatch(setMode(m.id))}
            disabled={generating || m.soon}
            title={m.soon ? "WebSocket transport — coming soon" : undefined}
          >
            {m.id}
            {m.soon && <span className={styles.soonBadge}>soon</span>}
          </button>
        ))}
      </div>

      <select
        className={styles.miniSelect}
        title="response_granularity"
        value={granularity}
        onChange={(e) => dispatch(setGranularity(e.target.value))}
        disabled={generating}
      >
        <option value="full">full</option>
        <option value="partial">partial</option>
        <option value="low">low</option>
      </select>

      <div className={styles.headRight}>
        {generating ? (
          <button
            className={`${styles.btnGhostSm} ${styles.danger}`}
            type="button"
            onClick={() => dispatch(stopGeneration())}
          >
            <Square size={13} />
            Stop
          </button>
        ) : null}
        <button
          className={styles.btnGhostSm}
          type="button"
          onClick={() => dispatch(fixThread())}
          disabled={!threadId || generating}
        >
          <RotateCcw size={13} />
          Fix thread
        </button>
      </div>
    </div>
  )
}
