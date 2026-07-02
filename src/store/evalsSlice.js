import { createSlice } from "@reduxjs/toolkit"

import { getAgentFlowClient } from "@/lib/agentflow-client"
import { getCurrentSettings } from "@/lib/settings-utils"

// Live eval-report inspector state. The eval endpoints aren't on the SDK yet, so
// we call them over raw fetch against the connected backend:
//   GET /v1/evals/runs           -> { runs: [...] }
//   GET /v1/evals/runs/{run_id}  -> full drilldown detail

const initialState = {
  runs: [],
  runsStatus: "idle", // idle | loading | ready | error
  runsError: null,

  selectedRunId: null,
  detail: null,
  detailStatus: "idle",
  detailError: null,
}

const evalsSlice = createSlice({
  name: "evals",
  initialState,
  reducers: {
    runsLoading: (s) => {
      s.runsStatus = "loading"
      s.runsError = null
    },
    runsLoaded: (s, a) => {
      s.runs = a.payload
      s.runsStatus = "ready"
    },
    runsFailed: (s, a) => {
      s.runsStatus = "error"
      s.runsError = a.payload
    },
    selectRun: (s, a) => {
      s.selectedRunId = a.payload
      s.detail = null
    },
    detailLoading: (s) => {
      s.detailStatus = "loading"
      s.detailError = null
    },
    detailLoaded: (s, a) => {
      s.detail = a.payload
      s.detailStatus = "ready"
    },
    detailFailed: (s, a) => {
      s.detailStatus = "error"
      s.detailError = a.payload
    },
  },
})

export const {
  runsLoading,
  runsLoaded,
  runsFailed,
  selectRun,
  detailLoading,
  detailLoaded,
  detailFailed,
} = evalsSlice.actions

// Resolve the base URL + auth header from the persisted connection (the SDK has
// no eval methods, so we hit the endpoints with fetch directly).
const evalFetch = async (path) => {
  const s = getCurrentSettings()
  // Ensures we're actually connected (throws a clear error otherwise).
  getAgentFlowClient()
  const base = (s.backendUrl || "").replace(/\/$/, "")
  const headers = { "Content-Type": "application/json" }
  if (s.authMode === "bearer" && s.authToken) headers.Authorization = `Bearer ${s.authToken}`
  else if (s.auth?.type === "basic")
    headers.Authorization = `Basic ${btoa(`${s.auth.username}:${s.auth.password}`)}`
  else if (s.authMode === "header" && Array.isArray(s.headers))
    s.headers.forEach((h) => h?.name && (headers[h.name] = h.value))

  const res = await fetch(`${base}${path}`, { headers })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const json = await res.json()
  return json?.data ?? json
}

/** GET /v1/evals/runs */
export const loadEvalRuns = () => async (dispatch, getState) => {
  dispatch(runsLoading())
  try {
    const data = await evalFetch("/v1/evals/runs")
    const runs = data.runs || []
    dispatch(runsLoaded(runs))
    if (!getState().evals.selectedRunId && runs.length) {
      dispatch(loadEvalRun(runs[0].id))
    }
  } catch (e) {
    dispatch(runsFailed(e?.message || "Failed to load eval runs"))
  }
}

/** GET /v1/evals/runs/{id} */
export const loadEvalRun = (runId) => async (dispatch) => {
  dispatch(selectRun(runId))
  dispatch(detailLoading())
  try {
    const detail = await evalFetch(`/v1/evals/runs/${encodeURIComponent(runId)}`)
    dispatch(detailLoaded(detail))
  } catch (e) {
    dispatch(detailFailed(e?.message || "Failed to load run detail"))
  }
}

export default evalsSlice.reducer
