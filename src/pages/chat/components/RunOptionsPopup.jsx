import { RotateCcw, X } from "lucide-react"
import { useEffect, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"

import { parseJsonObject, parseRecursionLimit } from "@/lib/run-options"
import { resetRunOptions, setRunOptions } from "@/store/chatSlice"

import styles from "../chat.module.css"

const PLACEHOLDER_STATE = '{\n  "user_name": "Shudipto"\n}'
const PLACEHOLDER_CONFIG = '{\n  "recursion_limit": 10\n}'

/** Per-run initial_state / config / recursion_limit, anchored above the composer. */
export default function RunOptionsPopup({ focus, onClose }) {
  const dispatch = useDispatch()
  const runOptions = useSelector((s) => s.chat.runOptions)
  const threadId = useSelector((s) => s.chat.threadId)
  const ref = useRef(null)
  const stateRef = useRef(null)
  const configRef = useRef(null)

  // Close on outside click or Escape, matching the thread picker's behaviour.
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    const onKey = (e) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  useEffect(() => {
    const target = focus === "config" ? configRef.current : stateRef.current
    target?.focus()
  }, [focus])

  const stateError = parseJsonObject(runOptions.initialState).error
  const configError = parseJsonObject(runOptions.config).error
  const limitError = parseRecursionLimit(runOptions.recursionLimit).error
  const set = (patch) => dispatch(setRunOptions(patch))

  return (
    <div className={styles.runPop} ref={ref}>
      <div className={styles.runPopHead}>
        <span className={styles.runPopTitle}>Run options</span>
        <button
          type="button"
          className={styles.runPopIcon}
          onClick={() => dispatch(resetRunOptions())}
          title="Reset"
        >
          <RotateCcw size={13} />
        </button>
        <button
          type="button"
          className={styles.runPopIcon}
          onClick={onClose}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>

      <div className={styles.runField}>
        <label htmlFor="run-initial-state">
          initial_state
          {stateError ? (
            <span className={styles.runErr}>{stateError}</span>
          ) : null}
        </label>
        <textarea
          id="run-initial-state"
          ref={stateRef}
          className={stateError ? styles.runBad : ""}
          rows={4}
          spellCheck={false}
          placeholder={PLACEHOLDER_STATE}
          value={runOptions.initialState}
          onChange={(e) => set({ initialState: e.target.value })}
        />
      </div>

      <div className={styles.runField}>
        <label htmlFor="run-config">
          config
          {configError ? (
            <span className={styles.runErr}>{configError}</span>
          ) : null}
        </label>
        <textarea
          id="run-config"
          ref={configRef}
          className={configError ? styles.runBad : ""}
          rows={4}
          spellCheck={false}
          placeholder={PLACEHOLDER_CONFIG}
          value={runOptions.config}
          onChange={(e) => set({ config: e.target.value })}
        />
        <span className={styles.runNote}>
          merged over{" "}
          <code>
            {threadId ? `{ "thread_id": "${threadId.slice(0, 8)}…" }` : "{ }"}
          </code>
        </span>
      </div>

      <div className={`${styles.runField} ${styles.runInline}`}>
        <label htmlFor="run-recursion">
          recursion_limit
          {limitError ? (
            <span className={styles.runErr}>{limitError}</span>
          ) : null}
        </label>
        <input
          id="run-recursion"
          className={limitError ? styles.runBad : ""}
          inputMode="numeric"
          placeholder="25"
          value={runOptions.recursionLimit}
          onChange={(e) => set({ recursionLimit: e.target.value })}
        />
      </div>
    </div>
  )
}
