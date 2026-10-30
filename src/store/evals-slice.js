import { createSelector, createSlice } from "@reduxjs/toolkit"

import { buildEvalRuns, parseEvalReport } from "@/lib/eval-report"
import { notifyError } from "@/lib/notify"

// Eval reports are files written by `10xgraph eval` (eval_reports/*.json) and
// opened in the browser. Nothing is fetched: the parsed reports live here for
// the session, and the run list and drilldowns are derived from them.

const initialState = {
  sources: [], // [{ id, report }], id is the file name
  selectedRunId: null,
  loadError: null,
}

const evalsSlice = createSlice({
  name: "evals",
  initialState,
  reducers: {
    reportsAdded: (s, a) => {
      for (const src of a.payload) {
        const at = s.sources.findIndex((x) => x.id === src.id)
        if (at === -1) s.sources.push(src)
        else s.sources[at] = src
      }
      s.loadError = null
    },
    selectRun: (s, a) => {
      s.selectedRunId = a.payload
    },
    loadFailed: (s, a) => {
      s.loadError = a.payload
    },
    reportsCleared: () => initialState,
  },
})

export const { reportsAdded, selectRun, loadFailed, reportsCleared } =
  evalsSlice.actions

/** Run rows and drilldowns derived from the loaded reports. */
export const selectEvalView = createSelector(
  [(state) => state.evals.sources],
  (sources) => buildEvalRuns(sources)
)

const readOne = async (file) => {
  if (!/\.json$/i.test(file.name)) {
    throw new Error(`${file.name} is not a .json file.`)
  }
  return parseEvalReport(await file.text(), file.name)
}

/**
 * Read and parse report files. Valid ones are added; invalid ones raise a single
 * error message (toast and inline) naming each file.
 */
export const openReportFiles = (files) => async (dispatch) => {
  const loaded = []
  const problems = []
  for (const file of files) {
    try {
      loaded.push(await readOne(file))
    } catch (e) {
      problems.push(e?.message || `Could not read ${file.name}.`)
    }
  }
  if (loaded.length) {
    dispatch(reportsAdded(loaded))
    dispatch(selectRun(loaded.at(-1).id))
  }
  if (problems.length) {
    const message = problems.join(" ")
    dispatch(loadFailed(message))
    notifyError("Could not open report", message)
  }
}

/** Add an already-parsed report (the demo sample). */
export const addParsedReport = (source) => (dispatch) => {
  dispatch(reportsAdded([source]))
  dispatch(selectRun(source.id))
}

export default evalsSlice.reducer
