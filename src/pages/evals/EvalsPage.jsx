import { useMemo, useState } from "react"

import CaseDetail from "./components/CaseDetail"
import Drilldown from "./components/Drilldown"
import RunList from "./components/RunList"
import { DETAILS } from "./data"
import styles from "./evals.module.css"

const INITIAL_RUN = "cs-5"
const INITIAL_CASE = "c3"

export default function EvalsPage() {
  const [runId, setRunId] = useState(INITIAL_RUN)
  const [tab, setTab] = useState("cases")
  const [caseId, setCaseId] = useState(INITIAL_CASE)

  const detail = DETAILS[runId] ?? null

  const activeCase = useMemo(() => {
    if (!detail) return null
    return detail.cases.find((c) => c.id === caseId) ?? null
  }, [detail, caseId])

  function handleSelectRun(id) {
    setRunId(id)
    setTab("cases")
    // Reset the case detail to the run's first case, or clear it if unknown run.
    const next = DETAILS[id]
    setCaseId(next ? next.cases[0].id : null)
  }

  return (
    <div className={styles.page}>
      <RunList selectedId={runId} onSelect={handleSelectRun} />
      <Drilldown
        detail={detail}
        tab={tab}
        onTab={setTab}
        selectedCaseId={caseId}
        onSelectCase={setCaseId}
      />
      <CaseDetail activeCase={activeCase} />
    </div>
  )
}
