import { RefreshCw } from "lucide-react"
import PropTypes from "prop-types"

import styles from "../trace.module.css"

import RunPicker from "./run-picker"
import ThreadSelect from "./thread-select"

const TABS = [
  { id: "trace", label: "Run tree" },
  { id: "events", label: "Events" },
  { id: "cost", label: "Tokens" },
]

export const SUBTITLE =
  "The latest runs of a thread, kept in server memory. Cleared on restart and off in production."

/**
 * Title, subtitle, thread and run pickers, Refresh, summary stats and view tabs.
 */
const TraceHeader = ({
  tab,
  onTab,
  stats = null,
  threads = [],
  threadId = null,
  onPickThread,
  runIds = [],
  currentRunId = null,
  onPickRun = () => {},
  onRefresh = () => {},
}) => (
  <div className={styles.obsHead}>
    <div className={styles.ohTop}>
      <span className={styles.ohTitle}>Run trace</span>
      <ThreadSelect
        threads={threads}
        current={threadId}
        onPick={onPickThread}
      />
      <RunPicker runIds={runIds} current={currentRunId} onPick={onPickRun} />
      <button
        type="button"
        className={styles.runPick}
        aria-label="Refresh trace"
        onClick={onRefresh}
      >
        <RefreshCw size={12} />
      </button>
    </div>
    <p className={styles.subtitle}>{SUBTITLE}</p>

    <div className={styles.stats}>
      {(stats || []).map((s) => (
        <div className={styles.stat} key={s.label} title={s.hint}>
          <div className={styles.sl}>{s.label}</div>
          <div className={`${styles.sv} ${s.accent ? styles.accent : ""}`}>
            {s.value}
            {s.small && <small>{s.small}</small>}
          </div>
        </div>
      ))}
    </div>

    <div className={styles.tabs}>
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`${styles.tab} ${tab === t.id ? styles.on : ""}`}
          onClick={() => onTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  </div>
)

TraceHeader.propTypes = {
  tab: PropTypes.string.isRequired,
  onTab: PropTypes.func.isRequired,
  stats: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.node,
      small: PropTypes.node,
      accent: PropTypes.bool,
      hint: PropTypes.string,
    })
  ),
  threads: PropTypes.array,
  threadId: PropTypes.string,
  onPickThread: PropTypes.func.isRequired,
  runIds: PropTypes.arrayOf(PropTypes.string),
  currentRunId: PropTypes.string,
  onPickRun: PropTypes.func,
  onRefresh: PropTypes.func,
}

export default TraceHeader
