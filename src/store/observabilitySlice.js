import { createSlice } from "@reduxjs/toolkit"

import { getAgentFlowClient } from "@/lib/agentflow-client"

// Observability state — a reconstructed run trace (spans + events + cost) for the
// active thread, fetched from GET /v1/observability/{thread_id}.

const initialState = {
  threadId: null,
  runCount: 0,
  runIds: [],
  run: null, // { run_id, status, duration_ms, spans, events, usage, llm_calls, tool_calls, iterations }
  status: "idle", // "idle" | "loading" | "ready" | "empty" | "error"
  error: null,
}

const observabilitySlice = createSlice({
  name: "observability",
  initialState,
  reducers: {
    obsLoading: (state) => {
      state.status = "loading"
      state.error = null
    },
    obsLoaded: (state, action) => {
      const { thread_id, run_count, run_ids, run } = action.payload
      state.threadId = thread_id
      state.runCount = run_count || 0
      state.runIds = run_ids || []
      state.run = run || null
      state.status = run ? "ready" : "empty"
    },
    obsError: (state, action) => {
      state.status = "error"
      state.error = action.payload
    },
    obsReset: () => initialState,
  },
})

export const { obsLoading, obsLoaded, obsError, obsReset } =
  observabilitySlice.actions

/**
 * Load the observability trace for a thread (latest run, or a specific run_id).
 */
export const loadObservability =
  (threadId, runId) => async (dispatch) => {
    if (!threadId) {
      dispatch(obsReset())
      return
    }
    let client
    try {
      client = getAgentFlowClient()
    } catch (e) {
      dispatch(obsError(e?.message || "Not connected to a backend"))
      return
    }

    dispatch(obsLoading())
    try {
      const res = await client.observability(threadId, runId)
      const data = res?.data || res || {}
      dispatch(obsLoaded(data))
    } catch (e) {
      // A thread with no runs yet returns 404 — treat as empty, not an error.
      if (e?.status === 404 || /not found/i.test(e?.message || "")) {
        dispatch(obsLoaded({ thread_id: threadId, run_count: 0, run_ids: [], run: null }))
        return
      }
      dispatch(obsError(e?.message || "Failed to load observability"))
    }
  }

export default observabilitySlice.reducer
