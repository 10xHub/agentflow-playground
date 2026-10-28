import PropTypes from "prop-types"
import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useSearchParams } from "react-router-dom"

import { useConnection } from "@/lib/connection/connection-context"
import { DEMO_TRACE_THREAD } from "@/lib/demo/callouts"
import { loadObservability } from "@/store/observability-slice"
import { loadThreadList } from "@/store/threads-slice"

import CostPane from "./components/cost-pane"
import EventsPane from "./components/events-pane"
import SpanDetail from "./components/span-detail"
import SpanTree from "./components/span-tree"
import TraceHeader from "./components/trace-header"
import styles from "./trace.module.css"
import { buildViewModel } from "./transform"
import { buildTree, defaultRow, expandableIds, visibleRows } from "./tree"

export const EMPTY_TEXT = {
  disabled_in_production:
    "Run trace is off because the server runs with MODE=production. Start the server in development mode to capture traces.",
  store_unavailable:
    "The server's trace store is not available. Restart the server in development mode and check its logs if this stays.",
  no_runs:
    "No runs captured for this thread yet. Send a message to it in Chat, then press Refresh. Traces are kept in server memory and cleared on restart.",
}

// The single placeholder line shown instead of the panes, or null when there is
// a trace to render.
const placeholderFor = ({ threadId, status, error, reason }) => {
  if (!threadId) return "Choose a thread to see the trace of its latest run."
  if (status === "loading") return "Loading trace…"
  if (status === "error") return error || "Failed to load trace."
  if (status === "empty") return EMPTY_TEXT[reason] ?? EMPTY_TEXT.no_runs
  return null
}

// ?thread= wins, then the chat thread, then the recorded demo thread.
const useTraceThread = () => {
  const [params, setParams] = useSearchParams()
  const chatThreadId = useSelector((s) => s.chat.threadId)
  const { isDemo } = useConnection()
  const threadId =
    params.get("thread") ?? chatThreadId ?? (isDemo ? DEMO_TRACE_THREAD : null)
  return [threadId, (id) => setParams(id ? { thread: id } : {})]
}

const Notes = ({ notes }) =>
  notes.length > 0 && (
    <div className={styles.notes} role="note">
      {notes.map((n) => (
        <div key={n}>{n}</div>
      ))}
    </div>
  )

Notes.propTypes = { notes: PropTypes.arrayOf(PropTypes.string).isRequired }

const RunError = ({ error = null }) =>
  error && (
    <div className={styles.runError} role="alert">
      Run failed: {error}
    </div>
  )

RunError.propTypes = { error: PropTypes.string }

const useTree = (run) => {
  const tree = useMemo(() => buildTree(run), [run])
  const [collapsed, setCollapsed] = useState(new Set())
  const [pickedId, setPickedId] = useState(null)
  const selId = pickedId ?? defaultRow(tree.rows)?.id ?? null
  const toggle = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  return {
    tree,
    collapsed,
    selId,
    selected: tree.rows.find((r) => r.id === selId)?.span ?? null,
    rows: visibleRows(tree.rows, collapsed),
    pick: setPickedId,
    toggle,
    expandAll: () => setCollapsed(new Set()),
    collapseAll: () => setCollapsed(new Set(expandableIds(tree.rows))),
  }
}

const TraceBody = ({ tab, vm, t }) => {
  if (tab === "events") {
    return (
      <EventsPane events={vm.events} selectedId={null} onSelect={() => {}} />
    )
  }
  if (tab === "cost") return <CostPane cost={vm.cost} />
  return (
    <SpanTree
      rows={t.rows}
      total={t.tree.total}
      selectedId={t.selId}
      collapsed={t.collapsed}
      onSelect={t.pick}
      onToggle={t.toggle}
      onExpandAll={t.expandAll}
      onCollapseAll={t.collapseAll}
    />
  )
}

TraceBody.propTypes = {
  tab: PropTypes.string.isRequired,
  vm: PropTypes.shape({ events: PropTypes.array, cost: PropTypes.object })
    .isRequired,
  t: PropTypes.object.isRequired,
}

// Tree state lives here so a different run (new key) starts expanded, with its
// default span selected.
const RunView = ({ run = null, vm, tab, header, placeholder = null }) => {
  const t = useTree(run)
  return (
    <>
      <div className={styles.main}>
        {header}
        <div className={styles.body}>
          {placeholder ? (
            <div className={styles.obsEmpty}>{placeholder}</div>
          ) : (
            <>
              <RunError error={run?.error} />
              <Notes notes={run?.notes ?? []} />
              <TraceBody tab={tab} vm={vm} t={t} />
            </>
          )}
        </div>
      </div>
      {!placeholder && <SpanDetail key={t.selId} span={t.selected} run={run} />}
    </>
  )
}

RunView.propTypes = {
  run: PropTypes.object,
  vm: PropTypes.object.isRequired,
  tab: PropTypes.string.isRequired,
  header: PropTypes.node.isRequired,
  placeholder: PropTypes.string,
}

/**
 * Run trace: a run tree on the left, the selected span's detail on the right.
 */
const TracePage = () => {
  const dispatch = useDispatch()
  const [threadId, setThread] = useTraceThread()
  const { run, status, error, runIds, reason } = useSelector(
    (s) => s.observability
  )
  const threads = useSelector((s) => s.threads?.list ?? [])
  const generating = useSelector((s) => s.chat.generating)
  const [tab, setTab] = useState("trace")

  // The thread selector is fed by the threads list.
  useEffect(() => {
    dispatch(loadThreadList({ select: false }))
  }, [dispatch])

  // Load the thread's latest run on mount / thread change, and again when a
  // chat run finishes (generating true -> false).
  useEffect(() => {
    if (!generating) dispatch(loadObservability(threadId))
  }, [dispatch, threadId, generating])

  const vm = useMemo(() => buildViewModel(run), [run])
  const reload = (id) => dispatch(loadObservability(threadId, id))

  const header = (
    <TraceHeader
      tab={tab}
      onTab={setTab}
      stats={vm.stats}
      threads={threads}
      threadId={threadId}
      onPickThread={setThread}
      runIds={runIds}
      currentRunId={run?.run_id ?? null}
      onPickRun={reload}
      onRefresh={() => reload(run?.run_id ?? undefined)}
    />
  )

  return (
    <RunView
      key={`${threadId}:${run?.run_id}`}
      run={run}
      vm={vm}
      tab={tab}
      header={header}
      placeholder={placeholderFor({ threadId, status, error, reason })}
    />
  )
}

export default TracePage
