import { Paperclip, SendHorizontal, Square } from "lucide-react"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { track } from "@/lib/analytics"
import { useConnection } from "@/lib/connection/ConnectionContext"
import { summariseRunOptions } from "@/lib/run-options"
import { sendMessage, stopGeneration } from "@/store/chatThunks"

import styles from "../chat.module.css"

import RunOptionsPopup from "./RunOptionsPopup"

/**
 *
 */
export default function Composer() {
  const dispatch = useDispatch()
  const generating = useSelector((s) => s.chat.generating)
  const runOptions = useSelector((s) => s.chat.runOptions)
  const { isConnected } = useConnection()
  const [text, setText] = useState("")
  const [popup, setPopup] = useState(null) // null | "initialState" | "config"

  const summary = summariseRunOptions(runOptions)
  const canSend = text.trim().length > 0 && !generating && isConnected

  const submit = () => {
    if (!canSend) return
    dispatch(sendMessage(text))
    // Message text is never sent to analytics.
    track("chat_message_sent", { has_run_options: Boolean(summary) })
    setText("")
  }

  const onKeyDown = (e) => {
    // ⌘↵ / Ctrl+↵ to send; plain Enter inserts a newline.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className={styles.composerWrap}>
      {popup ? (
        <RunOptionsPopup focus={popup} onClose={() => setPopup(null)} />
      ) : null}
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
          {!isConnected ? (
            <span className={styles.composerHint}>
              not connected — open Connection first
            </span>
          ) : generating ? (
            <span className={styles.composerHint}>streaming…</span>
          ) : (
            <span className={styles.composerHint}>
              <button
                type="button"
                className={`${styles.hintChip} ${summary ? styles.hintOn : ""}`}
                onClick={() => setPopup("initialState")}
                title="Set initial_state for the next run"
              >
                initial_state
              </button>
              ·
              <button
                type="button"
                className={`${styles.hintChip} ${summary ? styles.hintOn : ""}`}
                onClick={() => setPopup("config")}
                title="Override config / recursion_limit for the next run"
              >
                config overrides
              </button>
              {summary ? (
                <span className={styles.hintSummary}>{summary}</span>
              ) : null}
            </span>
          )}
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
            <button
              className={styles.send}
              type="button"
              onClick={submit}
              disabled={!canSend}
            >
              Send
              <SendHorizontal size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
