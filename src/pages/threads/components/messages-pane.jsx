import { Trash2 } from "lucide-react"
import PropTypes from "prop-types"
import { useDispatch, useSelector } from "react-redux"

import { removeMessage } from "@/store/threads-slice"

import styles from "../threads.module.css"

// Per-block-type renderers; unknown types fall back to a `[type]` placeholder.
const BLOCK_RENDERERS = {
  text: (b) => b.text,
  reasoning: (b) => `🧠 ${b.summary || b.details || ""}`,
  tool_call: (b) => `tool_call · ${b.name}(${JSON.stringify(b.args ?? {})})`,
  tool_result: (b) =>
    `tool_result · ${JSON.stringify(b.output ?? b.content ?? {})}`,
}

const renderBlock = (b) => {
  const render = BLOCK_RENDERERS[b?.type]
  return render ? render(b) : `[${b?.type || "block"}]`
}

// Flatten a message's content blocks into a readable summary.
const renderContent = (content) => {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content.map((b) => renderBlock(b)).join("\n")
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
const MessageRow = ({ threadId = null, msg, onDelete }) => {
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

MessageRow.propTypes = {
  threadId: PropTypes.string,
  msg: PropTypes.shape({
    role: PropTypes.string,
    content: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    message_id: PropTypes.string,
    timestamp: PropTypes.number,
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
}

/**
 *
 */
const MessagesPane = () => {
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

export default MessagesPane
