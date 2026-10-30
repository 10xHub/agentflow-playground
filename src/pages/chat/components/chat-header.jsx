import { RotateCcw, Square } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"

import { useConnection } from "@/lib/connection/connection-context"
import { setGranularity, setMode } from "@/store/chat-slice"
import { fixThread, stopGeneration } from "@/store/chat-thunks"

import styles from "../chat.module.css"

import ThreadPicker from "./thread-picker"

const MODES = [{ id: "invoke" }, { id: "stream" }, { id: "ws" }]

// The recorded demo holds streamed runs only, so invoke and ws need a live server.
const needsLiveServer = (m, isDemo) =>
  isDemo && (m.id === "invoke" || m.id === "ws")

const modeTitle = (m, isDemo) =>
  needsLiveServer(m, isDemo) ? "Live servers only" : undefined

/**
 *
 */
const ChatHeader = () => {
  const dispatch = useDispatch()
  const mode = useSelector((s) => s.chat.mode)
  const granularity = useSelector((s) => s.chat.granularity)
  const generating = useSelector((s) => s.chat.generating)
  const threadId = useSelector((s) => s.chat.threadId)
  const { isDemo } = useConnection()

  return (
    <div className={styles.head}>
      <ThreadPicker />

      <div className={styles.seg} role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={mode === m.id ? styles.on : ""}
            onClick={() => dispatch(setMode(m.id))}
            disabled={generating || needsLiveServer(m, isDemo)}
            title={modeTitle(m, isDemo)}
          >
            {m.id}
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

export default ChatHeader
