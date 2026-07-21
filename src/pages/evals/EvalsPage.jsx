import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { track } from "@/lib/analytics"
import { loadEvalRun, loadEvalRuns } from "@/store/evalsSlice"

import CaseDetail from "./components/CaseDetail"
import Drilldown from "./components/Drilldown"
import RunList from "./components/RunList"
import styles from "./evals.module.css"

/**
 *
 */
export default function EvalsPage() {
  const dispatch = useDispatch()
  const { runs, selectedRunId, detail, detailStatus, detailError } =
    useSelector((s) => s.evals)

  const [tab, setTab] = useState("cases")
  const [caseId, setCaseId] = useState(null)

  // Load runs on mount.
  useEffect(() => {
    dispatch(loadEvalRuns())
  }, [dispatch])

  // When a new detail arrives, default-select its first case.
  useEffect(() => {
    if (detail?.cases?.length) setCaseId(detail.cases[0].id)
  }, [detail])

  const activeCase = useMemo(() => {
    if (!detail) return null
    return detail.cases.find((c) => c.id === caseId) ?? null
  }, [detail, caseId])

  const handleSelectRun = (id) => {
    dispatch(loadEvalRun(id))
    // The run id is not sent.
    track("eval_run_viewed")
    setTab("cases")
  }

  return (
    <div className={styles.page}>
      <RunList
        runs={runs}
        selectedId={selectedRunId}
        onSelect={handleSelectRun}
      />
      <Drilldown
        detail={detail}
        status={detailStatus}
        error={detailError}
        tab={tab}
        onTab={setTab}
        selectedCaseId={caseId}
        onSelectCase={setCaseId}
      />
      <CaseDetail activeCase={activeCase} />
    </div>
  )
}
