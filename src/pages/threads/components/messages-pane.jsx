import { Trash2 } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"

import { removeMessage } from "@/store/threadsSlice"

import styles from "../threads.module.css"

// Flatten a message's content blocks into a readable summary.
const renderContent = (content) => {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content
    .map((b) => {
      if (b?.type === "text") return b.text
      if (b?.type === "reasoning") return `🧠 ${b.summary || b.details || ""}`
      if (b?.type === "tool_call") {
        return `tool_call · ${b.name}(${JSON.stringify(b.args ?? {})})`
      }
      if (b?.type === "tool_result") {
        return `tool_result · ${JSON.stringify(b.output ?? b.content ?? {})}`
      }
      return `[${b?.type || "block"}]`
    })
    .join("\n")
}

const timeOf = (m) => {
  if (!m.timestamp) return ""
  const d = new Date(m.timestamp * 1000)
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString([], { hour12: false })
}

/**
 *
 */
const MessageRow = ({ threadId, msg, onDelete }) => {
  const roleClass = styles[msg.role] || ""
  const body = renderContent(msg.content)
  const isMono = /tool_call|tool_result|🧠/.test(body) || msg.role === "tool"
  return (
    <div className={styles.mrow}>
      <div className={styles.mrowH}>
        <span className={`${styles.rb} ${roleClass}`}>{msg.role}</span>
        <span className={styles.mNode}>
          <b>{msg.message_id?.slice(0, 8) || "—"}</b>
        </span>
        <span className={styles.mTime}>{timeOf(msg)}</span>
        <button
          type="button"
          className={styles.mDel}
          title="Delete message"
          onClick={() => onDelete(threadId, msg.message_id)}
        >
          <Trash2 size={14} strokeWidth={1.7} />
        </button>
      </div>
      <div className={styles.mrowBody}>
        {isMono ? <pre>{body}</pre> : body || <em>(empty)</em>}
      </div>
    </div>
  )
}

/**
 *
 */
export default function MessagesPane() {
  const dispatch = useDispatch()
  const { selectedId, detail, detailStatus, busy } = useSelector(
    (s) => s.threads
  )
  const messages = detail?.messages || []

  const onDelete = (threadId, messageId) => {
    if (!threadId || !messageId) return
    dispatch(removeMessage(threadId, messageId))
  }

  if (detailStatus === "loading") {
    return <div className={styles.paneEmpty}>Loading messages…</div>
  }
  if (!messages.length) {
    return <div className={styles.paneEmpty}>No messages in this thread.</div>
  }

  return (
    <div className={busy ? styles.dim : ""}>
      {messages.map((message, index) => (
        <MessageRow
          key={message.message_id || index}
          threadId={selectedId}
          msg={message}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
