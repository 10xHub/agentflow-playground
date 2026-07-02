import { createSlice } from "@reduxjs/toolkit"

import { getAgentFlowClient } from "@/lib/agentflow-client"

import { loadGraph } from "./graphSlice"

// Thread-specific AgentState for the chat Inspector's State tab.
//
// One state per thread (a thread has exactly one checkpointed AgentState). We
// key everything by threadId in `byThread` so switching threads doesn't lose an
// edited draft, and so each thread shows its own state:
//
//   byThread[threadId] = {
//     server: {...},   // last snapshot fetched from GET /v1/threads/{id}/state
//     draft:  {...},   // local working copy the user edits (bidirectional)
//     status: "idle" | "loading" | "ready" | "error",
//     saving: bool,
//     error:  string | null,
//   }
//
// The field list is dynamic: three fields are fixed (context / context_summary /
// execution_meta); every other key is a graph-defined state field surfaced from
// the schema (shared with the Graph tab via graph.stateSchema).

export const FIXED_FIELDS = [
  "context",
  "context_summary",
  "execution_meta",
  "state",
]

// execution_meta is diagnostic — mirror the core ExecutionState shape so the UI
// can always render every slot even before a run has populated them.
const EMPTY_EXECUTION_META = {
  current_node: "",
  step: 0,
  status: "",
  interrupted_node: null,
  interrupt_reason: null,
  interrupt_data: null,
  thread_id: "",
  stop_current_execution: "none",
  internal_data: {},
}

// Normalize whatever the server returns into the shape the pane edits.
const normalizeState = (raw = {}) => {
  const out = {
    context: Array.isArray(raw.context) ? raw.context : [],
    context_summary: raw.context_summary ?? "",
    execution_meta: { ...EMPTY_EXECUTION_META, ...(raw.execution_meta || {}) },
  }
  Object.keys(raw).forEach((k) => {
    if (!FIXED_FIELDS.includes(k)) out[k] = raw[k]
  })
  return out
}

const unwrap = (res) => res?.data || res || {}

const blankEntry = () => ({
  server: null,
  draft: null,
  status: "idle",
  saving: false,
  error: null,
})

const entry = (state, threadId) => {
  if (!state.byThread[threadId]) state.byThread[threadId] = blankEntry()
  return state.byThread[threadId]
}

const initialState = {
  byThread: {}, // threadId -> entry (see above)
}

const stateSlice = createSlice({
  name: "threadState",
  initialState,
  reducers: {
    stateLoading: (s, a) => {
      const e = entry(s, a.payload)
      e.status = "loading"
      e.error = null
    },
    // Server snapshot arrived: replace the server copy, and seed the draft only
    // if the user hasn't already edited one (don't clobber in-flight edits).
    stateLoaded: (s, a) => {
      const { threadId, state } = a.payload
      const e = entry(s, threadId)
      const norm = normalizeState(state)
      e.server = norm
      e.draft = norm // fresh load resets the working copy to the server truth
      e.status = "ready"
      e.error = null
    },
    stateFailed: (s, a) => {
      const e = entry(s, a.payload.threadId)
      e.status = "error"
      e.error = a.payload.error
    },
    // A single field edit on the draft (bidirectional binding target). Used for
    // context_summary and dynamic fields — NOT context (see UNSAVABLE).
    setField: (s, a) => {
      const { threadId, key, value } = a.payload
      const e = entry(s, threadId)
      if (!e.draft) e.draft = normalizeState(e.server || {})
      e.draft = { ...e.draft, [key]: value }
    },
    // Discard local edits, snap the draft back to the last server snapshot.
    resetDraft: (s, a) => {
      const e = entry(s, a.payload)
      if (e.server) e.draft = e.server
    },
    savePending: (s, a) => {
      const e = entry(s, a.payload)
      e.saving = true
      e.error = null
    },
    saveDone: (s, a) => {
      const e = entry(s, a.payload)
      e.saving = false
    },
    saveFailed: (s, a) => {
      const e = entry(s, a.payload.threadId)
      e.saving = false
      e.error = a.payload.error
    },
  },
})

export const {
  stateLoading,
  stateLoaded,
  stateFailed,
  setField,
  resetDraft,
  savePending,
  saveDone,
  saveFailed,
} = stateSlice.actions

// Keys that must NEVER be sent in a state PUT:
//  - execution_meta: server-owned diagnostics.
//  - context: the state's `context` field uses an `add_messages` reducer on the
//    server, so PUT-ing it APPENDS (duplicates) rather than replaces. Message
//    edits go through the dedicated thread-messages endpoints instead.
//  - state: internal wrapper key, never a real field.
const UNSAVABLE = new Set(["execution_meta", "context", "state"])

// Compute a patch of only the changed, savable keys (context_summary + dynamic
// fields) so we don't clobber untouched fields or trip the context append trap.
const buildPatch = (server = {}, draft = {}) => {
  const patch = {}
  const keys = new Set([...Object.keys(server), ...Object.keys(draft)])
  keys.forEach((k) => {
    if (UNSAVABLE.has(k)) return
    if (
      JSON.stringify(server?.[k] ?? null) !== JSON.stringify(draft?.[k] ?? null)
    ) {
      patch[k] = draft[k]
    }
  })
  return patch
}

/**
 * Fetch the current AgentState for a thread from the checkpointer API.
 * Also ensures the state schema is loaded (shared with the Graph tab) so the
 * dynamic-field list has titles/types/descriptions.
 */
export const fetchThreadState = (threadId) => async (dispatch, getState) => {
  if (!threadId) return
  let client
  try {
    client = getAgentFlowClient()
  } catch (e) {
    dispatch(
      stateFailed({
        threadId,
        error: e?.message || "Not connected to a backend",
      })
    )
    return
  }
  // Lazily pull the schema once — reuses graph.stateSchema.
  if (!getState().graph.stateSchema) {
    dispatch(loadGraph({ withSchema: true }))
  }
  dispatch(stateLoading(threadId))
  try {
    const data = unwrap(await client.threadState(threadId))
    const state = data.state || data || {}
    dispatch(stateLoaded({ threadId, state }))
  } catch (e) {
    dispatch(
      stateFailed({
        threadId,
        error: e?.message || "Failed to load thread state",
      })
    )
  }
}

/**
 * Persist the edited draft back to the thread (PUT /v1/threads/{id}/state),
 * sending only changed keys, then re-fetch to confirm the server truth.
 */
export const saveThreadState = (threadId) => async (dispatch, getState) => {
  if (!threadId) return
  const e = getState().threadState.byThread[threadId]
  if (!e?.draft) return

  const patch = buildPatch(e.server, e.draft)
  if (Object.keys(patch).length === 0) return // nothing changed

  let client
  try {
    client = getAgentFlowClient()
  } catch (err) {
    dispatch(
      saveFailed({
        threadId,
        error: err?.message || "Not connected to a backend",
      })
    )
    return
  }

  dispatch(savePending(threadId))
  try {
    await client.updateThreadState(threadId, {}, patch)
    dispatch(saveDone(threadId))
    await dispatch(fetchThreadState(threadId)) // re-sync to server truth
  } catch (err) {
    dispatch(
      saveFailed({
        threadId,
        error: err?.message || "Failed to save thread state",
      })
    )
  }
}

export default stateSlice.reducer
