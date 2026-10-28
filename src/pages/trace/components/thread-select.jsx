import PropTypes from "prop-types"

import styles from "../trace.module.css"

const labelOf = (t) => t.thread_name || `${t.thread_id.slice(0, 12)}…`

/**
 * Chooses the thread whose runs are shown. The current thread stays an option
 * even when the loaded page of threads does not contain it.
 */
const ThreadSelect = ({ threads = [], current = null, onPick }) => {
  const known = threads.some((t) => t.thread_id === current)
  return (
    <select
      className={styles.runPick}
      aria-label="Thread"
      value={current ?? ""}
      onChange={(e) => onPick(e.target.value)}
    >
      {!current && <option value="">Choose a thread</option>}
      {current && !known && <option value={current}>{current}</option>}
      {threads.map((t) => (
        <option key={t.thread_id} value={t.thread_id}>
          {labelOf(t)}
        </option>
      ))}
    </select>
  )
}

ThreadSelect.propTypes = {
  threads: PropTypes.arrayOf(
    PropTypes.shape({
      thread_id: PropTypes.string,
      thread_name: PropTypes.string,
    })
  ),
  current: PropTypes.string,
  onPick: PropTypes.func.isRequired,
}

export default ThreadSelect
