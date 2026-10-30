import { FileUp } from "lucide-react"
import PropTypes from "prop-types"

import ErrorNote from "@/components/shell/error-note"

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
const RunsNotice = ({ error = null, empty }) => {
  if (error) return <ErrorNote message={error} />
  if (!empty) return null
  return (
    <div className={styles.empty} style={{ padding: "20px 14px" }}>
      No report loaded. Run 10xgraph eval, then open the JSON file it writes to
      eval_reports/. You can also drop the file anywhere on this page.
    </div>
  )
}

RunsNotice.propTypes = {
  error: PropTypes.string,
  empty: PropTypes.bool.isRequired,
}

/**
 *
 */
const RunList = ({
  runs,
  error = null,
  selectedId = null,
  onSelect,
  onOpen,
  onSample = undefined,
}) => {
  return (
    <section className={styles.runs}>
      <div className={styles.runsHead}>
        <h2>Eval runs</h2>
        <span className={styles.runsTools}>
          <span className={styles.cnt}>{runs.length}</span>
          <button type="button" className={styles.refresh} onClick={onOpen}>
            <FileUp size={11} />
            Open report file
          </button>
        </span>
      </div>
      <div className={styles.runsList}>
        <RunsNotice error={error} empty={runs.length === 0} />
        {onSample && runs.length === 0 && (
          <button
            type="button"
            className={styles.refresh}
            style={{ margin: "0 14px" }}
            onClick={onSample}
          >
            Load sample report
          </button>
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
              {r.errors > 0 && (
                <span className={styles.errCount}>
                  · {r.errors} {r.errors === 1 ? "error" : "errors"}
                </span>
              )}
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
      errors: PropTypes.number,
      ago: PropTypes.string,
    })
  ).isRequired,
  error: PropTypes.string,
  onOpen: PropTypes.func.isRequired,
  onSample: PropTypes.func,
  selectedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelect: PropTypes.func.isRequired,
}

export default RunList
