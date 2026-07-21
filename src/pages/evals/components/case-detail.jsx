import PropTypes from "prop-types"

import styles from "../evals.module.css"

const RUBRIC_COLOR = { danger: "var(--danger)", accent: "var(--accent)" }

/**
 *
 */
const CaseDetail = ({ activeCase = null }) => {
  if (!activeCase) {
    return (
      <aside className={styles.cdet}>
        <div className={styles.cdHead}>
          <span className={styles.cdTitle}>No case selected</span>
        </div>
        <div className={styles.cdBody}>
          <div className={styles.empty}>
            Select a case to inspect input, output and rubric.
          </div>
        </div>
      </aside>
    )
  }

  const fail = activeCase.status === "fail"
  const isSim = activeCase.type === "sim"

  return (
    <aside className={styles.cdet}>
      <div className={styles.cdHead}>
        <span className={styles.cdTitle}>{activeCase.name}</span>
        <span className={`${styles.cdBadge} ${styles[activeCase.status]}`}>
          {activeCase.status}
        </span>
      </div>
      <div className={styles.cdBody}>
        <div className={styles.cdH}>Input</div>
        <div className={`${styles.cdBox} ${styles.mono}`}>
          {activeCase.input}
        </div>

        {isSim && activeCase.conversation && (
          <>
            <div className={styles.cdH}>Simulated conversation</div>
            {activeCase.conversation.map((turn) => (
              <div className={styles.turn} key={`${turn.role}:${turn.text}`}>
                <div
                  className={`${styles.tav} ${turn.role === "sim" ? styles.u : styles.a}`}
                >
                  {turn.role === "sim" ? "SIM" : "AG"}
                </div>
                <div className={styles.tbub}>{turn.text}</div>
              </div>
            ))}
          </>
        )}

        <div className={styles.cdH}>Expected</div>
        <div className={`${styles.cdBox} ${styles.expected}`}>
          {activeCase.expected}
        </div>

        <div className={styles.cdH}>Actual</div>
        <div
          className={`${styles.cdBox} ${styles.actual} ${fail ? styles.fail : ""}`}
        >
          {activeCase.actual}
        </div>

        {activeCase.rubric && (
          <>
            <div className={styles.cdH}>Score · rubric</div>
            {activeCase.rubric.map((r) => (
              <div className={styles.rubric} key={r.key}>
                <span className={styles.rk}>{r.key}</span>
                <span className={styles.rt}>
                  <i
                    style={{
                      width: `${r.value * 100}%`,
                      background: RUBRIC_COLOR[r.tone],
                    }}
                  />
                </span>
                <span className={styles.rv}>{r.value.toFixed(2)}</span>
              </div>
            ))}
          </>
        )}

        <div className={styles.cdMeta}>
          <span>
            <b>threshold</b> 0.80
          </span>
          <span>
            <b>latency</b> {activeCase.lat}
          </span>
          <span>
            <b>cost</b> {activeCase.cost}
          </span>
        </div>
      </div>
    </aside>
  )
}

CaseDetail.propTypes = {
  activeCase: PropTypes.shape({
    name: PropTypes.string,
    status: PropTypes.string,
    type: PropTypes.string,
    input: PropTypes.string,
    expected: PropTypes.string,
    actual: PropTypes.string,
    lat: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    cost: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    conversation: PropTypes.arrayOf(
      PropTypes.shape({
        role: PropTypes.string,
        text: PropTypes.string,
      })
    ),
    rubric: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string,
        value: PropTypes.number,
        tone: PropTypes.string,
      })
    ),
  }),
}

export default CaseDetail
