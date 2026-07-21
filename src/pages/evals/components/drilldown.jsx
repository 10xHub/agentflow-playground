import { Download } from "lucide-react"
import PropTypes from "prop-types"

import styles from "../evals.module.css"

const THRESHOLD = 0.8

const CASE_SHAPE = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  name: PropTypes.string,
  type: PropTypes.string,
  status: PropTypes.string,
  score: PropTypes.number,
  lat: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  cost: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
})

const REGRESSION_SHAPE = PropTypes.shape({
  note: PropTypes.shape({
    current: PropTypes.string,
    prev: PropTypes.string,
    suite: PropTypes.string,
  }).isRequired,
  summary: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.node,
      tone: PropTypes.string,
    })
  ).isRequired,
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      delta: PropTypes.node,
      dir: PropTypes.string,
      flip: PropTypes.node,
      stay: PropTypes.bool,
    })
  ).isRequired,
})

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
const CasesPane = ({ cases, selectedCaseId = null, onSelectCase }) => (
  <div className={styles.ctable}>
    <div className={`${styles.crow} ${styles.h}`}>
      <span className={styles.cName}>case</span>
      <span className={styles.cType}>type</span>
      <span className={styles.cScore}>score · threshold 0.8</span>
      <span className={styles.cStat}>status</span>
      <span className={styles.cLat}>lat</span>
      <span className={styles.cCost}>cost</span>
    </div>
    {cases.map((c) => (
      <div
        key={c.id}
        className={`${styles.crow} ${c.id === selectedCaseId ? styles.active : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => onSelectCase(c.id)}
        onKeyDown={(e) => activateOnKey(e, () => onSelectCase(c.id))}
      >
        <span className={styles.cName}>
          <span className={styles.nm}>{c.name}</span>
        </span>
        <span className={styles.cType}>
          <span
            className={`${styles.tp} ${c.type === "sim" ? styles.sim : ""}`}
          >
            {c.type}
          </span>
        </span>
        <span className={styles.cScore}>
          <div className={styles.scoreTrack}>
            <div
              className={`${styles.scoreFill} ${styles[c.status]}`}
              style={{ width: `${c.score * 100}%` }}
            />
            <div
              className={styles.scoreTh}
              style={{ left: `${THRESHOLD * 100}%` }}
            />
          </div>
          <div className={styles.num}>
            <span>{c.score.toFixed(2)}</span>
          </div>
        </span>
        <span className={styles.cStat}>
          <span className={`${styles.b} ${styles[c.status]}`}>{c.status}</span>
        </span>
        <span className={styles.cLat}>{c.lat}</span>
        <span className={styles.cCost}>{c.cost}</span>
      </div>
    ))}
  </div>
)

CasesPane.propTypes = {
  cases: PropTypes.arrayOf(CASE_SHAPE).isRequired,
  selectedCaseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelectCase: PropTypes.func.isRequired,
}

/**
 *
 */
const RegressionPane = ({ regression }) => {
  const { note, summary, rows } = regression
  return (
    <>
      <div className={styles.regNote}>
        <b>Comparing</b> {note.current} &nbsp;vs&nbsp; {note.prev} ·{" "}
        {note.suite}
      </div>
      <div className={styles.regSum}>
        {summary.map((s) => (
          <div className={styles.rc} key={s.label}>
            <div className={styles.l}>{s.label}</div>
            <div className={`${styles.v} ${styles[s.tone]}`}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className={styles.cdH}>Case-level changes</div>
      <div className={styles.ctable}>
        {rows.map((r) => (
          <div className={styles.drow} key={r.name}>
            <span className={styles.dn}>{r.name}</span>
            <span className={`${styles.delta} ${styles[r.dir]}`}>
              {r.delta}
            </span>
            <span className={styles.flip}>
              <span className={`${styles.b} ${r.stay ? styles.stay : ""}`}>
                {r.flip}
              </span>
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

RegressionPane.propTypes = {
  regression: REGRESSION_SHAPE.isRequired,
}

/**
 *
 */
const StatsRow = ({ stats }) => (
  <div className={styles.dStats}>
    {stats.map((s) => (
      <div className={styles.dstat} key={s.label}>
        <div className={styles.sl}>{s.label}</div>
        <div className={`${styles.sv} ${s.tone ? styles[s.tone] : ""}`}>
          {s.value}
        </div>
      </div>
    ))}
  </div>
)

StatsRow.propTypes = {
  stats: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.node,
      tone: PropTypes.string,
    })
  ).isRequired,
}

/**
 *
 */
const TabButton = ({ id, label, tab, onTab }) => (
  <button
    className={`${styles.tab} ${tab === id ? styles.on : ""}`}
    onClick={() => onTab(id)}
  >
    {label}
  </button>
)

TabButton.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  tab: PropTypes.string.isRequired,
  onTab: PropTypes.func.isRequired,
}

/**
 *
 */
const DrilldownBody = ({
  detail,
  tab,
  selectedCaseId = null,
  onSelectCase,
}) => {
  if (tab === "cases") {
    return (
      <CasesPane
        cases={detail.cases}
        selectedCaseId={selectedCaseId}
        onSelectCase={onSelectCase}
      />
    )
  }
  if (!detail.regression) {
    return (
      <div className={styles.empty}>
        No regression data — this run has no prior baseline.
      </div>
    )
  }
  return <RegressionPane regression={detail.regression} />
}

DrilldownBody.propTypes = {
  detail: PropTypes.shape({
    cases: PropTypes.arrayOf(CASE_SHAPE),
    regression: REGRESSION_SHAPE,
  }).isRequired,
  tab: PropTypes.string.isRequired,
  selectedCaseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelectCase: PropTypes.func.isRequired,
}

/**
 *
 */
const Drilldown = ({
  detail = null,
  status = null,
  error = null,
  tab,
  onTab,
  selectedCaseId = null,
  onSelectCase,
}) => {
  if (status === "loading") {
    return (
      <section className={styles.detail}>
        <div className={styles.empty}>Loading report…</div>
      </section>
    )
  }
  if (status === "error") {
    return (
      <section className={styles.detail}>
        <div className={styles.empty}>{error}</div>
      </section>
    )
  }
  if (!detail) {
    return (
      <section className={styles.detail}>
        <div className={styles.empty}>Select a run to view its report.</div>
      </section>
    )
  }

  const failPct = (100 - detail.rate).toFixed(1)

  return (
    <section className={styles.detail}>
      <div className={styles.dHead}>
        <div className={styles.dTop}>
          <div>
            <div className={styles.dTitle}>{detail.title}</div>
            <div className={styles.sub}>{detail.sub}</div>
          </div>
          <div className={styles.dRate}>
            <div className={`${styles.big} ${styles[detail.status]}`}>
              {detail.rate.toFixed(1)}%
            </div>
            <div className={styles.lbl}>
              pass rate · threshold {detail.threshold}%
            </div>
          </div>
        </div>

        <StatsRow stats={detail.stats} />
        <div className={styles.distbar}>
          <span className={styles.pg} style={{ width: `${detail.rate}%` }} />
          <span className={styles.fl} style={{ width: `${failPct}%` }} />
        </div>

        <div className={styles.dActions}>
          <div className={styles.tabs}>
            <TabButton id="cases" label="Cases" tab={tab} onTab={onTab} />
            <TabButton id="reg" label="Regression" tab={tab} onTab={onTab} />
          </div>
          <div className={styles.right}>
            <button className={styles.abtn}>
              <Download size={13} strokeWidth={1.7} />
              Download HTML report
            </button>
          </div>
        </div>
      </div>

      <div className={styles.dBody}>
        <DrilldownBody
          detail={detail}
          tab={tab}
          selectedCaseId={selectedCaseId}
          onSelectCase={onSelectCase}
        />
      </div>
    </section>
  )
}

Drilldown.propTypes = {
  detail: PropTypes.shape({
    title: PropTypes.string,
    sub: PropTypes.string,
    status: PropTypes.string,
    rate: PropTypes.number,
    threshold: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    stats: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string,
        value: PropTypes.node,
        tone: PropTypes.string,
      })
    ),
    cases: PropTypes.arrayOf(CASE_SHAPE),
    regression: REGRESSION_SHAPE,
  }),
  status: PropTypes.string,
  error: PropTypes.string,
  tab: PropTypes.string.isRequired,
  onTab: PropTypes.func.isRequired,
  selectedCaseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelectCase: PropTypes.func.isRequired,
}

export default Drilldown
