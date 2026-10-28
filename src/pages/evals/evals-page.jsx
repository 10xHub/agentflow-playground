import { useMemo, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { useConnection } from "@/lib/connection/connection-context"
import { evalMarkdownName, buildEvalMarkdown } from "@/lib/eval-markdown"
import { parseEvalReport } from "@/lib/eval-report"
import { track } from "@/lib/usage-events"
import {
  addParsedReport,
  openReportFiles,
  selectEvalView,
  selectRun,
} from "@/store/evals-slice"

import CaseDetail from "./components/case-detail"
import Drilldown from "./components/drilldown"
import RunList from "./components/run-list"
import styles from "./evals.module.css"

// Hand the Markdown to the browser as a file download.
const downloadText = (name, text) => {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

// File picker and drag-and-drop intake for report files.
const useReportIntake = (dispatch) => {
  const [dragging, setDragging] = useState(false)

  const openFiles = (files) => {
    if (files.length) dispatch(openReportFiles(files))
  }

  const onInput = (event) => {
    openFiles([...event.target.files])
    // Allow picking the same file again after it changed on disk.
    event.target.value = ""
  }

  const dropProps = {
    onDragOver: (e) => {
      e.preventDefault()
      setDragging(true)
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
    },
    onDrop: (e) => {
      e.preventDefault()
      setDragging(false)
      openFiles([...e.dataTransfer.files])
    },
  }

  return { dragging, onInput, dropProps }
}

// Which run and case are on screen. The picked case is stored together with
// the detail it belongs to, so a new detail falls back to its first case
// without needing an effect.
const useEvalSelection = (runs, details, selectedRunId) => {
  const [picked, setPicked] = useState({ detail: null, id: null })

  const runId = details[selectedRunId] ? selectedRunId : (runs[0]?.id ?? null)
  const detail = runId ? details[runId] : null

  const firstCaseId = detail?.cases?.[0]?.id ?? null
  const caseId = picked.detail === detail ? picked.id : firstCaseId

  const activeCase = useMemo(
    () => detail?.cases.find((c) => c.id === caseId) ?? null,
    [detail, caseId]
  )

  const selectCase = (id) => setPicked({ detail, id })

  return { runId, detail, caseId, activeCase, selectCase }
}

// Load the bundled sample report (demo mode only).
const loadSampleReport = async () => {
  const sample = (await import("@/demo/sample-eval-report.json")).default
  return parseEvalReport(JSON.stringify(sample), "sample-eval-report.json")
}

/**
 *
 */
const EvalsPage = () => {
  const dispatch = useDispatch()
  const { isDemo } = useConnection()
  const { selectedRunId, loadError } = useSelector((s) => s.evals)
  const { runs, details } = useSelector(selectEvalView)
  const inputRef = useRef(null)
  const { dragging, onInput, dropProps } = useReportIntake(dispatch)

  const [tab, setTab] = useState("cases")
  const { runId, detail, caseId, activeCase, selectCase } = useEvalSelection(
    runs,
    details,
    selectedRunId
  )
  const handleSelectCase = selectCase

  const handleSelectRun = (id) => {
    dispatch(selectRun(id))
    // The run id is not sent.
    track("eval_run_viewed")
    setTab("cases")
  }

  const handleSample = async () => {
    dispatch(addParsedReport(await loadSampleReport()))
  }

  const handleDownload = () => {
    downloadText(evalMarkdownName(detail), buildEvalMarkdown(detail))
  }

  return (
    <div
      className={`${styles.page} ${dragging ? styles.dropping : ""}`}
      {...dropProps}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        multiple
        hidden
        data-testid="eval-file-input"
        onChange={onInput}
      />
      <RunList
        runs={runs}
        error={loadError}
        onOpen={() => inputRef.current?.click()}
        onSample={isDemo ? handleSample : undefined}
        selectedId={runId}
        onSelect={handleSelectRun}
      />
      <Drilldown
        detail={detail}
        tab={tab}
        onTab={setTab}
        selectedCaseId={caseId}
        onSelectCase={handleSelectCase}
        onDownload={detail ? handleDownload : undefined}
      />
      <CaseDetail
        activeCase={activeCase}
        threshold={detail ? Number(detail.threshold) / 100 : null}
      />
    </div>
  )
}

export default EvalsPage
