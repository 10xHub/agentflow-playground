import PropTypes from "prop-types"

import styles from "../trace-detail.module.css"

const callName = (c) => c?.name ?? "tool"

/**
 * Message summaries from a span, drawn as chat bubbles.
 */
const MessageBubbles = ({ messages }) => (
  <div className={styles.bubbles}>
    {messages.map((m, i) => (
      // Summaries carry no id, so the position is the identity here.
      <div
        // eslint-disable-next-line react/no-array-index-key
        key={i}
        className={`${styles.bubble} ${styles[`role_${m.role}`]}`}
      >
        <div className={styles.bubbleRole}>{m.role}</div>
        {m.text && <div className={styles.bubbleText}>{m.text}</div>}
        {(m.tool_calls || []).map((c, j) => (
          <div key={c?.id ?? j} className={styles.bubbleChip}>
            calls {callName(c)}
          </div>
        ))}
        {(m.tool_results || []).map((r, j) => (
          <div key={r?.call_id ?? j} className={styles.bubbleChip}>
            result{r?.is_error ? " (error)" : ""}
          </div>
        ))}
      </div>
    ))}
  </div>
)

MessageBubbles.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      role: PropTypes.string,
      text: PropTypes.string,
      tool_calls: PropTypes.array,
      tool_results: PropTypes.array,
    })
  ).isRequired,
}

export default MessageBubbles
