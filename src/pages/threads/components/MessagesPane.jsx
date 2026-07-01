import { AlertTriangle, Trash2 } from "lucide-react"
import { useState } from "react"

import { MESSAGES, TURNS } from "../data"
import styles from "../threads.module.css"

function MessageRow({ msg, onDelete }) {
  const roleClass = styles[msg.role] || ""
  return (
    <div className={`${styles.mrow} ${msg.broken ? styles.broken : ""}`}>
      <div className={styles.mrowH}>
        <span className={`${styles.rb} ${roleClass}`}>{msg.roleLabel || msg.role}</span>
        {msg.nodeLabel ? (
          <span className={styles.mNode}>
            node <b>{msg.node}</b>
          </span>
        ) : msg.nodeMeta ? (
          <span className={styles.mNode}>
            <b>{msg.node}</b> {msg.nodeMeta}
          </span>
        ) : (
          <span className={styles.mNode}>
            <b>{msg.node}</b>
          </span>
        )}
        {msg.brokenTag ? <span className={styles.brokenTag}>{msg.brokenTag}</span> : null}
        <span className={styles.mTime}>{msg.time}</span>
        <button
          type="button"
          className={styles.mDel}
          title="Delete message"
          onClick={() => onDelete(msg.id)}
        >
          <Trash2 size={14} strokeWidth={1.7} />
        </button>
      </div>
      <div className={styles.mrowBody}>
        {msg.pre ? (
          <pre>{msg.pre}</pre>
        ) : (
          <>
            {msg.body}
            {msg.mono ? (
              <>
                <br />
                <span className="mono">{msg.mono}</span>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export default function MessagesPane() {
  const [deleted, setDeleted] = useState(() => new Set())
  const onDelete = (id) => setDeleted((prev) => new Set(prev).add(id))
  const messages = MESSAGES.filter((m) => !deleted.has(m.id))

  return (
    <div>
      <div className={styles.diag}>
        <AlertTriangle size={17} strokeWidth={1.8} />
        <div className={styles.diagB}>
          <div className={styles.dt}>Dangling tool call detected</div>
          <div className={styles.dd}>
            Message <code>msg_4f…</code> issues a <code>tool_call</code> with no matching{" "}
            <code>tool_result</code>, wedging the thread at node <code>tools</code>. Run{" "}
            <b>Fix thread</b> to clear it, or delete the offending message below, then re-check.
          </div>
        </div>
      </div>

      {messages.map((msg) => (
        <div key={msg.id}>
          {TURNS[msg.id] ? (
            <div className={styles.mline}>
              <span className={styles.lbl}>{TURNS[msg.id]}</span>
              <span className={styles.l} />
            </div>
          ) : null}
          <MessageRow msg={msg} onDelete={onDelete} />
        </div>
      ))}
    </div>
  )
}
