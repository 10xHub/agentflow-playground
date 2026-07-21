import { createSlice } from "@reduxjs/toolkit"

import { getAgentFlowClient } from "@/lib/agentflow-client"

// Live memory-store inspector state (POST /v1/store/*). Two modes:
//   browse -> listMemories()          (all memories, newest first)
//   search -> searchMemory(query, ...)(scored results)
// plus store / delete / forget mutations.

const initialState = {
  mode: "browse", // "browse" | "search"
  items: [], // normalized memory rows (see normalize())
  status: "idle", // idle | loading | ready | error | unconfigured
  error: null,
  selectedId: null,
  query: "",
  strategy: "SIMILARITY",
  metric: "cosine",
  collection: "agentflow_memories",
  busy: false,
}

// Adapt the API's MemorySearchResult to the shape the memory components expect.
const normalize = (m) => ({
  id: m.id,
  type: m.memory_type || "custom",
  cat: m.metadata?.category || "general",
  thread: m.thread_id || "—",
  ts: m.timestamp
    ? new Date(m.timestamp).toISOString().replace("T", " ").slice(0, 16)
    : "—",
  score: typeof m.score === "number" ? m.score : 0,
  content: m.content || "",
  meta: m.metadata || {},
})

const memorySlice = createSlice({
  name: "memory",
  initialState,
  reducers: {
    setMode: (s, a) => {
      s.mode = a.payload
    },
    setQuery: (s, a) => {
      s.query = a.payload
    },
    setStrategy: (s, a) => {
      s.strategy = a.payload
    },
    setMetric: (s, a) => {
      s.metric = a.payload
    },
    setCollection: (s, a) => {
      s.collection = a.payload || "agentflow_memories"
    },
    selectMemory: (s, a) => {
      s.selectedId = a.payload
    },
    loading: (s) => {
      s.status = "loading"
      s.error = null
    },
    loaded: (s, a) => {
      s.items = a.payload
      s.status = "ready"
      if (!s.items.some((m) => m.id === s.selectedId)) {
        s.selectedId = s.items[0]?.id || null
      }
    },
    failed: (s, a) => {
      s.status = "error"
      s.error = a.payload
    },
    // The agent has no store backend wired in agentflow.json — the API answers
    // the store endpoints with 503 "Store is not configured". This is not an
    // error the user can act on from here, so it gets its own empty state.
    unconfigured: (s, a) => {
      s.status = "unconfigured"
      s.items = []
      s.selectedId = null
      s.error = a.payload || null
    },
    setBusy: (s, a) => {
      s.busy = a.payload
    },
  },
})

export const {
  setMode,
  setQuery,
  setStrategy,
  setMetric,
  setCollection,
  selectMemory,
  loading,
  loaded,
  failed,
  unconfigured,
  setBusy,
} = memorySlice.actions

const unwrap = (res) => res?.data || res || {}

const NOT_CONNECTED = "Not connected"

// The store service raises HTTP 503 "Store is not configured" when no `store`
// is wired in agentflow.json. The client surfaces that as an AgentFlowError with
// statusCode 503; match on it (with a message fallback) to branch to the
// dedicated "not configured" state instead of the generic error state.
const isStoreUnconfigured = (e) =>
  e?.statusCode === 503 || /not configured/i.test(e?.message || "")

// Route a failed store fetch: the "not configured" case gets its own state,
// everything else is a generic error.
const dispatchFetchError = (dispatch, e, fallback) => {
  if (isStoreUnconfigured(e)) dispatch(unconfigured(e?.message))
  else dispatch(failed(e?.message || fallback))
}

const cfgFor = (getState) => {
  const { collection } = getState().memory
  return collection ? { collection } : {}
}

/** Browse all loaded memories. */
export const browseMemories = () => async (dispatch, getState) => {
  let client
  try {
    client = getAgentFlowClient()
  } catch (e) {
    dispatch(failed(e?.message || NOT_CONNECTED))
    return
  }
  dispatch(loading())
  try {
    const data = unwrap(
      await client.listMemories({ config: cfgFor(getState), limit: 100 })
    )
    dispatch(loaded((data.memories || []).map(normalize)))
  } catch (e) {
    dispatchFetchError(dispatch, e, "Failed to list memories")
  }
}

/** Semantic search. */
export const searchMemories = (query) => async (dispatch, getState) => {
  let client
  try {
    client = getAgentFlowClient()
  } catch (e) {
    dispatch(failed(e?.message || NOT_CONNECTED))
    return
  }
  const { strategy, metric } = getState().memory
  dispatch(setQuery(query))
  dispatch(loading())
  try {
    const data = unwrap(
      await client.searchMemory({
        query,
        config: cfgFor(getState),
        limit: 25,
        // These are first-class SearchMemorySchema fields — passing them via
        // `options` collides with the service's explicit kwargs (dummy store's
        // asearch would get retrieval_strategy twice → 500).
        retrieval_strategy: strategy?.toLowerCase(),
        distance_metric: metric,
      })
    )
    dispatch(loaded((data.results || data.memories || []).map(normalize)))
  } catch (e) {
    dispatchFetchError(dispatch, e, "Search failed")
  }
}

/** Re-run the current mode (used after mutations / config changes). */
export const refreshMemories = () => (dispatch, getState) => {
  const { mode, query } = getState().memory
  if (mode === "search" && query) return dispatch(searchMemories(query))
  return dispatch(browseMemories())
}

/** Delete one memory, then refresh. */
export const deleteMemory = (id) => async (dispatch) => {
  const client = getAgentFlowClient()
  dispatch(setBusy(true))
  try {
    await client.deleteMemory(id)
    await dispatch(refreshMemories())
  } finally {
    dispatch(setBusy(false))
  }
}

/** Forget the currently shown set (all visible). */
export const forgetVisible = () => async (dispatch, getState) => {
  const client = getAgentFlowClient()
  const ids = getState().memory.items.map((m) => m.id)
  dispatch(setBusy(true))
  try {
    // No bulk endpoint that matches arbitrary ids; delete individually.
    await Promise.all(
      ids.map((id) => client.deleteMemory(id).catch(() => null))
    )
    await dispatch(refreshMemories())
  } finally {
    dispatch(setBusy(false))
  }
}

export default memorySlice.reducer
