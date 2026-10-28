import { createSlice } from "@reduxjs/toolkit"

import { getTenxGraphClient } from "@/lib/tenxgraph-client"

// Run trace state — a reconstructed run trace (spans + events + cost) for the
// active thread, fetched from GET /v1/observability/{thread_id}.

const initialState = {
  threadId: null,
  runCount: 0,
  runIds: [],
  run: null, // { run_id, status, duration_ms, error, model, notes, spans, events, usage, ... }
  enabled: true, // false when the server's trace store is off (payload `enabled`)
  reason: null, // null | "disabled_in_production" | "store_unavailable" | "no_runs"
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
      const { thread_id, run_count, run_ids, run, enabled, reason } =
        action.payload
      state.threadId = thread_id
      state.runCount = run_count || 0
      state.runIds = run_ids || []
      state.run = run || null
      // Older servers send neither field: treat them as enabled.
      state.enabled = enabled !== false
      state.reason = run ? null : (reason ?? "no_runs")
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

const unwrap = (res) => res?.data || res || {}

// A thread with no runs yet returns 404 — treat as empty, not an error.
const isNotFound = (e) =>
  e?.status === 404 ||
  e?.statusCode === 404 ||
  /not found/i.test(e?.message || "")

/**
 * Load the observability trace for a thread (latest run, or a specific run_id).
 */
export const loadObservability = (threadId, runId) => async (dispatch) => {
  if (!threadId) {
    dispatch(obsReset())
    return
  }
  let client
  try {
    client = getTenxGraphClient()
  } catch (e) {
    dispatch(obsError(e?.message || "Not connected to a backend"))
    return
  }

  dispatch(obsLoading())
  try {
    const res = await client.observability(threadId, runId)
    dispatch(obsLoaded(unwrap(res)))
  } catch (e) {
    if (isNotFound(e)) {
      dispatch(
        obsLoaded({ thread_id: threadId, run_count: 0, run_ids: [], run: null })
      )
      return
    }
    dispatch(obsError(e?.message || "Failed to load observability"))
  }
}

export default observabilitySlice.reducer
