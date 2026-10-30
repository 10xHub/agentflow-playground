import PropTypes from "prop-types"

import styles from "../evals.module.css"

const RUBRIC_COLOR = { danger: "var(--danger)", accent: "var(--accent)" }

const asText = (v) => (typeof v === "string" ? v : JSON.stringify(v))

const detailLines = (details) =>
  details ? Object.entries(details).map(([k, v]) => [k, asText(v)]) : []

const toolText = (t) =>
  t.args && Object.keys(t.args).length
    ? `${t.name}(${JSON.stringify(t.args)})`
    : t.name

const expectedLines = (detail, responseLabel) => {
  const lines = []
  if (detail?.response) lines.push([responseLabel, detail.response])
  if (detail?.tool_trajectory?.length) {
    lines.push(["tools", detail.tool_trajectory.map(toolText).join(", ")])
  }
  if (detail?.node_order?.length) {
    lines.push(["nodes", detail.node_order.join(" > ")])
  }
  return lines
}

/**
 * Structured expectations when the server recorded them, else its one-line summary.
 */
const Expected = ({ summary, detail = null, responseLabel = "response" }) => {
  const lines = expectedLines(detail, responseLabel)
  return (
    <div className={`${styles.cdBox} ${styles.expected}`}>
      {lines.length === 0
        ? summary
        : lines.map(([k, v]) => (
            <div className={styles.expLine} key={k}>
              <b>{k}</b>
              <span>{v}</span>
            </div>
          ))}
    </div>
  )
}

Expected.propTypes = {
  summary: PropTypes.string.isRequired,
  responseLabel: PropTypes.string,
  detail: PropTypes.shape({
    response: PropTypes.string,
    tool_trajectory: PropTypes.arrayOf(PropTypes.object),
    node_order: PropTypes.arrayOf(PropTypes.string),
  }),
}

/**
 * One rubric row: score bar, pass state and threshold, then recorded details or error.
 */
const RubricRow = ({ row }) => {
  const summary = row.kind === "summary"
  const lines = detailLines(row.details)
  return (
    <div className={`${styles.rubricItem} ${summary ? styles.summary : ""}`}>
      <div className={styles.rubric}>
        <span className={styles.rk}>{row.key}</span>
        {typeof row.passed === "boolean" && (
          <span
            className={`${styles.rp} ${row.passed ? styles.ok : styles.bad}`}
          >
            {row.passed ? "passed" : "failed"}
          </span>
        )}
        <span className={styles.rt}>
          <i
            style={{
              width: `${row.value * 100}%`,
              background: RUBRIC_COLOR[row.tone],
            }}
          />
        </span>
        <span className={styles.rv}>{row.value.toFixed(2)}</span>
      </div>
      {typeof row.threshold === "number" && (
        <div className={styles.rnote}>threshold {row.threshold.toFixed(2)}</div>
      )}
      {lines.map(([k, v]) => (
        <div className={styles.rnote} key={k}>
          {k === "reason" ? v : `${k}: ${v}`}
        </div>
      ))}
      {row.error && (
        <div className={`${styles.rnote} ${styles.rerr}`}>{row.error}</div>
      )}
    </div>
  )
}

RubricRow.propTypes = {
  row: PropTypes.shape({
    key: PropTypes.string,
    value: PropTypes.number,
    tone: PropTypes.string,
    kind: PropTypes.string,
    passed: PropTypes.bool,
    threshold: PropTypes.number,
    details: PropTypes.object,
    error: PropTypes.string,
  }).isRequired,
}

const Conversation = ({ turns = null }) => {
  if (!turns) return null
  return (
    <>
      <div className={styles.cdH}>Simulated conversation</div>
      {turns.map((turn) => (
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
  )
}

Conversation.propTypes = {
  turns: PropTypes.arrayOf(
    PropTypes.shape({ role: PropTypes.string, text: PropTypes.string })
  ),
}

const CaseError = ({ text = null }) => {
  if (!text) return null
  return (
    <>
      <div className={styles.cdH}>Error</div>
      <div className={`${styles.cdBox} ${styles.caseError}`} role="alert">
        {text}
      </div>
    </>
  )
}

CaseError.propTypes = { text: PropTypes.string }

const Rubric = ({ rows = null }) => {
  if (!rows) return null
  return (
    <>
      <div className={styles.cdH}>Score · rubric</div>
      {rows.map((r) => (
        <RubricRow key={r.key} row={r} />
      ))}
    </>
  )
}

Rubric.propTypes = { rows: PropTypes.arrayOf(PropTypes.object) }

/**
 *
 */
const CaseDetail = ({ activeCase = null, threshold = null }) => {
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

        <Conversation turns={isSim ? activeCase.conversation : null} />

        <div className={styles.cdH}>Expected</div>
        <Expected
          summary={activeCase.expected ?? "—"}
          detail={activeCase.expected_detail}
          responseLabel={activeCase.expected_label}
        />

        <CaseError text={activeCase.error} />

        <div className={styles.cdH}>Actual</div>
        <div
          className={`${styles.cdBox} ${styles.actual} ${fail ? styles.fail : ""}`}
        >
          {activeCase.actual}
        </div>

        <Rubric rows={activeCase.rubric} />

        <div className={styles.cdMeta}>
          <span>
            <b>threshold</b> {threshold == null ? "n/a" : threshold.toFixed(2)}
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
  threshold: PropTypes.number,
  activeCase: PropTypes.shape({
    name: PropTypes.string,
    status: PropTypes.string,
    type: PropTypes.string,
    input: PropTypes.string,
    error: PropTypes.string,
    expected: PropTypes.string,
    expected_detail: PropTypes.object,
    expected_label: PropTypes.string,
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
        kind: PropTypes.string,
        passed: PropTypes.bool,
        threshold: PropTypes.number,
        details: PropTypes.object,
        error: PropTypes.string,
      })
    ),
  }),
}

export default CaseDetail
