import { Download } from "lucide-react"

import styles from "../evals.module.css"

const THRESHOLD = 0.8

function CasesPane({ cases, selectedCaseId, onSelectCase }) {
  return (
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
          onClick={() => onSelectCase(c.id)}
        >
          <span className={styles.cName}>
            <span className={styles.nm}>{c.name}</span>
          </span>
          <span className={styles.cType}>
            <span className={`${styles.tp} ${c.type === "sim" ? styles.sim : ""}`}>
              {c.type}
            </span>
          </span>
          <span className={styles.cScore}>
            <div className={styles.scoreTrack}>
              <div
                className={`${styles.scoreFill} ${styles[c.status]}`}
                style={{ width: `${c.score * 100}%` }}
              />
              <div className={styles.scoreTh} style={{ left: `${THRESHOLD * 100}%` }} />
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
}

function RegressionPane({ regression }) {
  const { note, summary, rows } = regression
  return (
    <>
      <div className={styles.regNote}>
        <b>Comparing</b> {note.current} &nbsp;vs&nbsp; {note.prev} · {note.suite}
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
            <span className={`${styles.delta} ${styles[r.dir]}`}>{r.delta}</span>
            <span className={styles.flip}>
              <span className={`${styles.b} ${r.stay ? styles.stay : ""}`}>{r.flip}</span>
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

export default function Drilldown({ detail, tab, onTab, selectedCaseId, onSelectCase }) {
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
            <div className={styles.lbl}>pass rate · threshold {detail.threshold}%</div>
          </div>
        </div>

        <div className={styles.dStats}>
          {detail.stats.map((s) => (
            <div className={styles.dstat} key={s.label}>
              <div className={styles.sl}>{s.label}</div>
              <div className={`${styles.sv} ${s.tone ? styles[s.tone] : ""}`}>{s.value}</div>
            </div>
          ))}
        </div>
        <div className={styles.distbar}>
          <span className={styles.pg} style={{ width: `${detail.rate}%` }} />
          <span className={styles.fl} style={{ width: `${failPct}%` }} />
        </div>

        <div className={styles.dActions}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === "cases" ? styles.on : ""}`}
              onClick={() => onTab("cases")}
            >
              Cases
            </button>
            <button
              className={`${styles.tab} ${tab === "reg" ? styles.on : ""}`}
              onClick={() => onTab("reg")}
            >
              Regression
            </button>
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
        {tab === "cases" ? (
          <CasesPane
            cases={detail.cases}
            selectedCaseId={selectedCaseId}
            onSelectCase={onSelectCase}
          />
        ) : (
          <RegressionPane regression={detail.regression} />
        )}
      </div>
    </section>
  )
}
