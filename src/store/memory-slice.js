import { createSlice } from "@reduxjs/toolkit"

import { notifyError, notifySuccess } from "@/lib/notify"
import { getTenxGraphClient } from "@/lib/tenxgraph-client"

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
  busy: false,
  // Demo mode: the last search was a keyword fallback, not the store's search.
  keywordMatch: false,
  // Facets. types null = every type. They go to the server as search filters.
  filters: { types: null, cat: null, minScore: 0 },
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
    setFilters: (s, a) => {
      s.filters = { ...s.filters, ...a.payload }
    },
    setKeywordMatch: (s, a) => {
      s.keywordMatch = a.payload
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
    // The agent has no store backend wired in 10xgraph.json — the API answers
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
  setFilters,
  selectMemory,
  setKeywordMatch,
  loading,
  loaded,
  failed,
  unconfigured,
  setBusy,
} = memorySlice.actions

const unwrap = (res) => res?.data || res || {}

// Server-side filters for a search. A single selected type is sent as memory_type;
// several (or all) types are not, and the page narrows the results itself.
const searchFilters = ({ types, cat, minScore }) => ({
  ...(types?.length === 1 ? { memory_type: types[0] } : {}),
  ...(cat ? { category: cat } : {}),
  ...(minScore > 0 ? { score_threshold: minScore } : {}),
})

const NOT_CONNECTED = "Not connected"

// The store service raises HTTP 503 "Store is not configured" when no `store`
// is wired in 10xgraph.json. The client surfaces that as a TenxGraphError with
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

/** Browse all loaded memories. */
export const browseMemories = () => async (dispatch) => {
  let client
  try {
    client = getTenxGraphClient()
  } catch (e) {
    dispatch(failed(e?.message || NOT_CONNECTED))
    return
  }
  dispatch(loading())
  try {
    const data = unwrap(await client.listMemories({ limit: 100 }))
    dispatch(setKeywordMatch(false))
    dispatch(loaded((data.memories || []).map(normalize)))
  } catch (e) {
    dispatchFetchError(dispatch, e, "Failed to list memories")
  }
}

/** Semantic search. */
export const searchMemories = (query) => async (dispatch, getState) => {
  let client
  try {
    client = getTenxGraphClient()
  } catch (e) {
    dispatch(failed(e?.message || NOT_CONNECTED))
    return
  }
  const { strategy, metric, filters } = getState().memory
  dispatch(setQuery(query))
  dispatch(loading())
  try {
    const data = unwrap(
      await client.searchMemory({
        query,
        limit: 25,
        // These are first-class SearchMemorySchema fields — passing them via
        // `options` collides with the service's explicit kwargs (dummy store's
        // asearch would get retrieval_strategy twice → 500).
        retrieval_strategy: strategy?.toLowerCase(),
        distance_metric: metric,
        ...searchFilters(filters),
      })
    )
    dispatch(setKeywordMatch(Boolean(data.keyword)))
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

/** Change the facets; a search in progress re-runs with the new server filters. */
export const applyFilters = (patch) => (dispatch, getState) => {
  dispatch(setFilters(patch))
  const { mode, query } = getState().memory
  if (mode === "search" && query) return dispatch(searchMemories(query))
  return undefined
}

/** Delete one memory, then refresh. */
export const deleteMemory = (id) => async (dispatch) => {
  const client = getTenxGraphClient()
  dispatch(setBusy(true))
  try {
    await client.deleteMemory(id)
    await dispatch(refreshMemories())
  } catch (e) {
    notifyError("Could not delete memory", e)
  } finally {
    dispatch(setBusy(false))
  }
}

/** Forget exactly the given ids (the rows the user sees), then refresh. */
export const forgetVisible = (ids) => async (dispatch) => {
  const client = getTenxGraphClient()
  dispatch(setBusy(true))
  try {
    // No bulk endpoint that matches arbitrary ids; delete individually.
    const results = await Promise.allSettled(
      ids.map((id) => client.deleteMemory(id))
    )
    const failed = results.filter((r) => r.status === "rejected")
    if (failed.length) {
      notifyError(
        `Forgot ${ids.length - failed.length} of ${ids.length} memories`,
        failed[0].reason?.message || failed[0].reason
      )
    }
    await dispatch(refreshMemories())
  } finally {
    dispatch(setBusy(false))
  }
}

/** Create a memory, refresh the list and select the new row. Resolves true on success. */
export const createMemory = (values) => async (dispatch) => {
  const client = getTenxGraphClient()
  dispatch(setBusy(true))
  try {
    const res = unwrap(await client.storeMemory(values))
    dispatch(setMode("browse"))
    await dispatch(browseMemories())
    if (res.memory_id) dispatch(selectMemory(res.memory_id))
    notifySuccess("Memory saved")
    return true
  } catch (e) {
    notifyError("Could not save memory", e)
    return false
  } finally {
    dispatch(setBusy(false))
  }
}

/** Change a memory's content and metadata, then refresh. Resolves true on success. */
export const editMemory =
  (id, { content, metadata }) =>
  async (dispatch) => {
    const client = getTenxGraphClient()
    dispatch(setBusy(true))
    try {
      await client.updateMemory(id, content, { metadata })
      await dispatch(refreshMemories())
      notifySuccess("Memory updated")
      return true
    } catch (e) {
      notifyError("Could not update memory", e)
      return false
    } finally {
      dispatch(setBusy(false))
    }
  }

export default memorySlice.reducer
