import PropTypes from "prop-types"

import styles from "../trace.module.css"

const shortId = (id) =>
  id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id

/**
 * Picks which run of the thread to show. Run ids arrive oldest first.
 */
const RunPicker = ({ runIds = [], current = null, onPick }) => {
  if (!runIds.length) return null
  if (runIds.length === 1) return <span className={styles.runPick}>1 run</span>
  const newestFirst = [...runIds].reverse()
  return (
    <select
      className={styles.runPick}
      aria-label="Run"
      value={current ?? newestFirst[0]}
      onChange={(e) => onPick(e.target.value)}
    >
      {newestFirst.map((id, i) => (
        <option key={id} value={id}>
          {shortId(id)}
          {i === 0 ? " (latest)" : ""}
        </option>
      ))}
    </select>
  )
}

RunPicker.propTypes = {
  runIds: PropTypes.arrayOf(PropTypes.string),
  current: PropTypes.string,
  onPick: PropTypes.func.isRequired,
}

export default RunPicker
