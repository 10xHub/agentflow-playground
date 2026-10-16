import { Trash2 } from "lucide-react"
import PropTypes from "prop-types"
import { useDispatch, useSelector } from "react-redux"

import { Trace } from "@/components/ui/trace"
import chatStyles from "@/pages/chat/chat.module.css"
import { ReasoningStep, ToolStep } from "@/pages/chat/components/agent-steps"
import RichText from "@/pages/chat/components/rich-text"
import { removeMessage } from "@/store/threads-slice"

import styles from "../threads.module.css"

const pretty = (value) =>
  typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2)

// A stored tool result has no name of its own; the message metadata carries it.
const toolResult = (block, msg) => ({
  name: msg.metadata?.function_name ?? "tool",
  code: pretty(block.output ?? block.content),
  isError: Boolean(block.is_error),
})

// Per-block-type renderers, shared with Chat; unknown types show as `[type]`.
const BLOCK_RENDERERS = {
  text: (b) => (
    <div className={chatStyles.prose}>
      <RichText text={b.text || ""} />
    </div>
  ),
  reasoning: (b) => <ReasoningStep text={b.summary || b.details || ""} />,
  tool_call: (b) => <ToolStep call={{ name: b.name, code: pretty(b.args) }} />,
  tool_result: (b, msg) => <ToolStep result={toolResult(b, msg)} />,
}

const renderBlock = (block, msg) => {
  const render = BLOCK_RENDERERS[block?.type]
  return render ? (
    render(block, msg)
  ) : (
    <span className="font-mono text-xs text-muted-foreground">
      [{block?.type || "block"}]
    </span>
  )
}

/** A message's content: plain text, or its blocks as Chat renders them. */
const MessageBody = ({ msg }) => {
  const { content } = msg
  if (typeof content === "string") {
    return content ? BLOCK_RENDERERS.text({ text: content }) : <em>(empty)</em>
  }
  if (!Array.isArray(content) || content.length === 0) return <em>(empty)</em>
  return (
    <Trace>
      {content.map((block, index) => (
        // Stored blocks have no id; their order in the message is fixed.
        // eslint-disable-next-line react/no-array-index-key
        <div key={index} className="min-w-0">
          {renderBlock(block, msg)}
        </div>
      ))}
    </Trace>
  )
}

MessageBody.propTypes = {
  msg: PropTypes.shape({
    content: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  }).isRequired,
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
        <MessageBody msg={msg} />
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
    metadata: PropTypes.shape({ function_name: PropTypes.string }),
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
