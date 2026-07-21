import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { track } from "@/lib/analytics"
import { loadEvalRun, loadEvalRuns } from "@/store/evals-slice"

import CaseDetail from "./components/case-detail"
import Drilldown from "./components/drilldown"
import RunList from "./components/run-list"
import styles from "./evals.module.css"

/**
 *
 */
const EvalsPage = () => {
  const dispatch = useDispatch()
  const { runs, selectedRunId, detail, detailStatus, detailError } =
    useSelector((s) => s.evals)

  const [tab, setTab] = useState("cases")
  // The picked case is stored together with the detail it belongs to, so a new
  // detail falls back to its first case without needing an effect.
  const [picked, setPicked] = useState({ detail: null, id: null })

  // Load runs on mount.
  useEffect(() => {
    dispatch(loadEvalRuns())
  }, [dispatch])

  const caseId =
    picked.detail === detail ? picked.id : (detail?.cases?.[0]?.id ?? null)

  const handleSelectCase = (id) => setPicked({ detail, id })

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
        onSelectCase={handleSelectCase}
      />
      <CaseDetail activeCase={activeCase} />
    </div>
  )
}

export default EvalsPage
