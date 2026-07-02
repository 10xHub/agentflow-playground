import { Paperclip, SendHorizontal, Square } from "lucide-react"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { useConnection } from "@/lib/connection/ConnectionContext"
import { sendMessage, stopGeneration } from "@/store/chatThunks"

import styles from "../chat.module.css"

export default function Composer() {
  const dispatch = useDispatch()
  const generating = useSelector((s) => s.chat.generating)
  const { isConnected } = useConnection()
  const [text, setText] = useState("")

  const canSend = text.trim().length > 0 && !generating && isConnected

  const submit = () => {
    if (!canSend) return
    dispatch(sendMessage(text))
    setText("")
  }

  const onKeyDown = (e) => {
    // ⌘↵ / Ctrl+↵ to send; plain Enter inserts a newline.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      submit()
    }
  }

  const hint = !isConnected
    ? "not connected — open Connection first"
    : generating
      ? "streaming…"
      : "initial_state · config overrides"

  return (
    <div className={styles.composerWrap}>
      <div className={styles.composer}>
        <textarea
          rows={1}
          placeholder="Message the agent…  (⌘↵ to send)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={generating}
        />
        <div className={styles.composerFoot}>
          <button className={styles.attach} type="button" title="Attach file">
            <Paperclip size={17} />
          </button>
          <span className={styles.composerHint}>{hint}</span>
          {generating ? (
            <button
              className={`${styles.send} ${styles.stop}`}
              type="button"
              onClick={() => dispatch(stopGeneration())}
            >
              Stop
              <Square size={13} />
            </button>
          ) : (
            <button className={styles.send} type="button" onClick={submit} disabled={!canSend}>
              Send
              <SendHorizontal size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
