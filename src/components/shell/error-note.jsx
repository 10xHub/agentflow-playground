import PropTypes from "prop-types"

import styles from "./error-note.module.css"

/**
 * Inline error for a pane that failed to load.
 */
const ErrorNote = ({ message, onRetry = undefined }) => (
  <div className={styles.note} role="alert">
    <span className={styles.message}>{message}</span>
    {onRetry && (
      <button type="button" className={styles.retry} onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
)

ErrorNote.propTypes = {
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func,
}

export default ErrorNote
