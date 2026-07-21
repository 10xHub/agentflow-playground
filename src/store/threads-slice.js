import { createSlice } from "@reduxjs/toolkit"

import { getAgentFlowClient } from "@/lib/agentflow-client"

// Live thread inspector data from the checkpointer API:
//   list    -> GET  /v1/threads          -> data.threads[]
//   state   -> GET  /v1/threads/{id}/state    -> data.state {context, execution_meta, ...}
//   messages-> GET  /v1/threads/{id}/messages -> data.messages[]
// plus clear-state / delete-thread / delete-message mutations.

const initialState = {
  list: [], // [{ thread_id, thread_name, user_id, updated_at, run_id, metadata }]
  listStatus: "idle", // idle | loading | ready | error
  listError: null,

  selectedId: null,
  detail: null, // { state, messages } for the selected thread
  detailStatus: "idle",
  detailError: null,

  busy: false, // a mutation (clear/delete) is in flight
}

const threadsSlice = createSlice({
  name: "threads",
  initialState,
  reducers: {
    listLoading: (s) => {
      s.listStatus = "loading"
      s.listError = null
    },
    listLoaded: (s, a) => {
      s.list = a.payload
      s.listStatus = "ready"
    },
    listFailed: (s, a) => {
      s.listStatus = "error"
      s.listError = a.payload
    },
    selectThread: (s, a) => {
      s.selectedId = a.payload
      s.detail = null
      s.detailError = null
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
    setBusy: (s, a) => {
      s.busy = a.payload
    },
    threadRemoved: (s, a) => {
      const id = a.payload
      s.list = s.list.filter((t) => t.thread_id !== id)
      if (s.selectedId === id) {
        s.selectedId = s.list[0]?.thread_id || null
        s.detail = null
      }
    },
  },
})

export const {
  listLoading,
  listLoaded,
  listFailed,
  selectThread,
  detailLoading,
  detailLoaded,
  detailFailed,
  setBusy,
  threadRemoved,
} = threadsSlice.actions

const unwrap = (res) => res?.data || res || {}

// State + messages come from two independent endpoints; either may be missing,
// in which case the state's own `context` is the message list.
const detailFrom = (stateRes, msgRes) => {
  const state = unwrap(stateRes).state || null
  return { state, messages: unwrap(msgRes).messages || state?.context || [] }
}

/** GET /v1/threads — the thread list. */
export const loadThreadList = () => async (dispatch, getState) => {
  let client
  try {
    client = getAgentFlowClient()
  } catch (e) {
    dispatch(listFailed(e?.message || "Not connected to a backend"))
    return
  }
  dispatch(listLoading())
  try {
    const data = unwrap(await client.threads())
    const list = data.threads || []
    dispatch(listLoaded(list))
    // Auto-select the first thread if none selected yet.
    if (!getState().threads.selectedId && list.length) {
      dispatch(loadThread(list[0].thread_id))
    }
  } catch (e) {
    dispatch(listFailed(e?.message || "Failed to load threads"))
  }
}

/** Load a single thread's state + messages. */
export const loadThread = (threadId) => async (dispatch) => {
  dispatch(selectThread(threadId))
  let client
  try {
    client = getAgentFlowClient()
  } catch (e) {
    dispatch(detailFailed(e?.message || "Not connected"))
    return
  }
  dispatch(detailLoading())
  try {
    const [stateRes, msgRes] = await Promise.all([
      client.threadState(threadId).catch(() => null),
      client.threadMessages(threadId).catch(() => null),
    ])
    dispatch(detailLoaded(detailFrom(stateRes, msgRes)))
  } catch (e) {
    dispatch(detailFailed(e?.message || "Failed to load thread"))
  }
}

/** DELETE a thread, then refresh the list. */
export const removeThread = (threadId) => async (dispatch) => {
  const client = getAgentFlowClient()
  dispatch(setBusy(true))
  try {
    await client.deleteThread(threadId)
    dispatch(threadRemoved(threadId))
  } finally {
    dispatch(setBusy(false))
  }
}

/** Clear a thread's checkpoint state, then reload its detail. */
export const clearThread = (threadId) => async (dispatch) => {
  const client = getAgentFlowClient()
  dispatch(setBusy(true))
  try {
    await client.clearThreadState(threadId)
    await dispatch(loadThread(threadId))
  } finally {
    dispatch(setBusy(false))
  }
}

/** Delete a single message from a thread, then reload its detail. */
export const removeMessage = (threadId, messageId) => async (dispatch) => {
  const client = getAgentFlowClient()
  dispatch(setBusy(true))
  try {
    await client.deleteMessage(threadId, messageId)
    await dispatch(loadThread(threadId))
  } finally {
    dispatch(setBusy(false))
  }
}

export default threadsSlice.reducer
