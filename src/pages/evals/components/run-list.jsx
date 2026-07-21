import PropTypes from "prop-types"

import styles from "../evals.module.css"

// Enter/Space activate the row the same way a click does.
const activateOnKey = (event, activate) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault()
    activate()
  }
}

/**
 *
 */
const RunList = ({ runs, selectedId = null, onSelect }) => {
  return (
    <section className={styles.runs}>
      <div className={styles.runsHead}>
        <h2>Eval runs</h2>
        <span className={styles.cnt}>{runs.length}</span>
      </div>
      <div className={styles.runsList}>
        {runs.length === 0 && (
          <div className={styles.empty} style={{ padding: "20px 14px" }}>
            No eval runs — connect to a backend.
          </div>
        )}
        {runs.map((r) => (
          <div
            key={r.id}
            className={`${styles.rrow} ${r.id === selectedId ? styles.active : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(r.id)}
            onKeyDown={(e) => activateOnKey(e, () => onSelect(r.id))}
          >
            <div className={styles.rrowTop}>
              <span className={styles.rrowName}>{r.name}</span>
              <span className={`${styles.passPill} ${styles[r.status]}`}>
                {r.rate.toFixed(1)}%
              </span>
            </div>
            <div className={styles.rrowMeta}>
              <span>{r.run}</span>
              <span>· {r.cases} cases</span>
              <span>· {r.ago}</span>
            </div>
            <div className={styles.minibar}>
              <i style={{ width: `${r.rate}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

RunList.propTypes = {
  runs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      status: PropTypes.string,
      rate: PropTypes.number,
      run: PropTypes.string,
      cases: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      ago: PropTypes.string,
    })
  ).isRequired,
  selectedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelect: PropTypes.func.isRequired,
}

export default RunList
