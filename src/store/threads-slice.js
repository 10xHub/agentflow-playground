import { createSlice } from "@reduxjs/toolkit"

import { notifyError } from "@/lib/notify"
import { getTenxGraphClient } from "@/lib/tenxgraph-client"

import { removeThread as removeCachedThread } from "./chat-slice"

// GET /v1/threads and /v1/threads/{id}/messages take offset/limit and answer with an
// exact has_more flag, which drives "Load more".
export const THREAD_PAGE = 50
export const MESSAGE_PAGE = 100

// Live thread inspector data from the checkpointer API:
//   list    -> GET  /v1/threads          -> data.threads[]
//   state   -> GET  /v1/threads/{id}/state    -> data.state {context, execution_meta, ...}
//   messages-> GET  /v1/threads/{id}/messages -> data.messages[]
// plus clear-state / delete-thread / delete-message mutations.

const initialState = {
  list: [], // [{ thread_id, thread_name, user_id, updated_at, run_id, metadata }]
  listStatus: "idle", // idle | loading | ready | error
  listError: null,
  search: "", // server-side search term behind the current list
  hasMore: false, // the server reported more rows after the last page
  loadingMore: false,

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
    listLoading: (s, a) => {
      s.listStatus = "loading"
      s.listError = null
      if (a.payload?.search !== undefined) s.search = a.payload.search
    },
    listLoaded: (s, a) => {
      s.list = a.payload
      s.listStatus = "ready"
      s.hasMore = false
    },
    listPageLoaded: (s, a) => {
      const { threads, hasMore } = a.payload
      s.list = threads
      s.listStatus = "ready"
      s.hasMore = hasMore
    },
    moreLoading: (s) => {
      s.loadingMore = true
    },
    morePageLoaded: (s, a) => {
      const { threads, hasMore } = a.payload
      const seen = new Set(s.list.map((t) => t.thread_id))
      s.list.push(...threads.filter((t) => !seen.has(t.thread_id)))
      s.hasMore = hasMore
      s.loadingMore = false
    },
    moreFailed: (s) => {
      s.loadingMore = false
    },
    messagesAppended: (s, a) => {
      if (!s.detail) return
      const { messages, hasMore } = a.payload
      s.detail.messages.push(...messages)
      s.detail.messagesHasMore = hasMore
      s.detail.loadingMore = false
    },
    messagesMoreLoading: (s) => {
      if (s.detail) s.detail.loadingMore = true
    },
    messagesMoreFailed: (s) => {
      if (s.detail) s.detail.loadingMore = false
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
    detailPartial: (s, a) => {
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
  listPageLoaded,
  moreLoading,
  morePageLoaded,
  moreFailed,
  messagesAppended,
  messagesMoreLoading,
  messagesMoreFailed,
  listFailed,
  selectThread,
  detailLoading,
  detailLoaded,
  detailFailed,
  detailPartial,
  setBusy,
  threadRemoved,
} = threadsSlice.actions

const unwrap = (res) => res?.data || res || {}

// State + messages come from two independent endpoints; either may be missing,
// in which case the state's own `context` is the message list.
const detailFrom = (stateRes, msgRes) => {
  const state = unwrap(stateRes).state || null
  const msgs = unwrap(msgRes)
  const paged = msgs.messages
  return {
    state,
    messages: paged || state?.context || [],
    messagesHasMore: Boolean(paged) && msgs.has_more === true,
  }
}

// A selection kept from before (for example a thread an in-memory server lost on
// restart) that the full, unfiltered list no longer has is replaced too.
const selectFirst = (dispatch, getState, list, complete) => {
  const { selectedId } = getState().threads
  const gone =
    selectedId && complete && !list.some((t) => t.thread_id === selectedId)
  if (gone && !list.length) dispatch(selectThread(null))
  if ((!selectedId || gone) && list.length) {
    dispatch(loadThread(list[0].thread_id))
  }
}

const pageRequest = (search, offset) => ({
  ...(search ? { search } : {}),
  offset,
  limit: THREAD_PAGE,
})

const clientOrFail = (dispatch) => {
  try {
    return getTenxGraphClient()
  } catch (e) {
    dispatch(listFailed(e?.message || "Not connected to a backend"))
    return null
  }
}

const termOf = (search, state) => (search ?? state.threads.search ?? "").trim()

let listRequest = 0 // newest list request wins; stale responses are dropped

/**
 * GET /v1/threads, first page. `search` is a server-side search (omit to keep the
 * current term). `select: false` skips auto-loading the first thread (used by the
 * sidebar badge at startup and the Chat picker).
 */
export const loadThreadList =
  ({ select = true, search } = {}) =>
  async (dispatch, getState) => {
    const client = clientOrFail(dispatch)
    if (!client) return
    const term = termOf(search, getState())
    const mine = ++listRequest
    dispatch(listLoading({ search: term }))
    try {
      const data = unwrap(await client.threads(pageRequest(term, 0)))
      if (mine !== listRequest) return
      const threads = data.threads || []
      dispatch(listPageLoaded({ threads, hasMore: data.has_more === true }))
      // Auto-select the first thread if none selected yet.
      // Only a complete list (no search, no further page) can show a thread is gone.
      const complete = !term && data.has_more !== true
      if (select) selectFirst(dispatch, getState, threads, complete)
    } catch (e) {
      if (mine === listRequest) {
        dispatch(listFailed(e?.message || "Failed to load threads"))
      }
    }
  }

/** Append the next page of the current list. */
export const loadMoreThreads = () => async (dispatch, getState) => {
  const { list, search, loadingMore, hasMore } = getState().threads
  if (loadingMore || !hasMore) return
  const mine = listRequest
  dispatch(moreLoading())
  try {
    const client = getTenxGraphClient()
    const data = unwrap(await client.threads(pageRequest(search, list.length)))
    if (mine !== listRequest) return
    const threads = data.threads || []
    dispatch(morePageLoaded({ threads, hasMore: data.has_more === true }))
  } catch (e) {
    dispatch(moreFailed())
    notifyError("Could not load more threads", e)
  }
}

/** Append the next page of the selected thread's messages. */
export const loadMoreMessages = () => async (dispatch, getState) => {
  const { selectedId, detail } = getState().threads
  if (!selectedId || !detail?.messagesHasMore || detail.loadingMore) return
  dispatch(messagesMoreLoading())
  try {
    const client = getTenxGraphClient()
    const res = await client.threadMessages(selectedId, {
      offset: detail.messages.length,
      limit: MESSAGE_PAGE,
    })
    if (getState().threads.selectedId !== selectedId) return
    const data = unwrap(res)
    dispatch(
      messagesAppended({
        messages: data.messages || [],
        hasMore: data.has_more === true,
      })
    )
  } catch (e) {
    dispatch(messagesMoreFailed())
    notifyError("Could not load more messages", e)
  }
}

const LOAD_FAILED = "Failed to load thread"
const isNoState = (r) => r.status === "rejected" && r.reason?.statusCode === 404
const failedOf = (r) => r.status === "rejected" && !isNoState(r)
const valueOf = (r) => (r.status === "fulfilled" ? r.value : null)
const reasonOf = (r, fallback) => r.reason?.message || fallback

// Apply the settled state + messages calls to the store.
const applyDetail = (dispatch, st, ms) => {
  const stateFailed = failedOf(st)
  const msgsFailed = failedOf(ms)
  if (stateFailed && msgsFailed) {
    dispatch(detailFailed(reasonOf(st, LOAD_FAILED)))
    return
  }
  dispatch(detailLoaded(detailFrom(valueOf(st), valueOf(ms))))
  const bad = stateFailed ? st : msgsFailed ? ms : null
  if (bad) dispatch(detailPartial(reasonOf(bad, LOAD_FAILED)))
}

/** Load a single thread's state + messages. */
export const loadThread = (threadId) => async (dispatch) => {
  dispatch(selectThread(threadId))
  let client
  try {
    client = getTenxGraphClient()
  } catch (e) {
    dispatch(detailFailed(e?.message || "Not connected"))
    return
  }
  dispatch(detailLoading())
  const [st, ms] = await Promise.allSettled([
    client.threadState(threadId),
    client.threadMessages(threadId, { offset: 0, limit: MESSAGE_PAGE }),
  ])
  applyDetail(dispatch, st, ms)
}

// Run a mutation with the busy flag; toast and resolve false on failure.
const mutate = (title, run) => async (dispatch) => {
  dispatch(setBusy(true))
  try {
    await run(dispatch, getTenxGraphClient())
    return true
  } catch (e) {
    notifyError(title, e)
    return false
  } finally {
    dispatch(setBusy(false))
  }
}

/** DELETE a thread; if it was selected, load the next one. */
export const removeThread = (threadId) => (dispatch, getState) =>
  dispatch(
    mutate("Could not delete thread", async (d, client) => {
      const before = getState().threads.selectedId
      await client.deleteThread(threadId)
      d(threadRemoved(threadId))
      d(removeCachedThread(threadId)) // also leaves the Chat picker / resets Chat
      const next = getState().threads.selectedId
      if (next && next !== before) await d(loadThread(next))
    })
  )

/** Clear a thread's checkpoint state, then reload its detail. */
export const clearThread = (threadId) =>
  mutate("Could not clear state", async (d, client) => {
    await client.clearThreadState(threadId)
    await d(loadThread(threadId))
  })

/** Delete a single message from a thread, then reload its detail. */
export const removeMessage = (threadId, messageId) =>
  mutate("Could not delete message", async (d, client) => {
    await client.deleteMessage(threadId, messageId)
    await d(loadThread(threadId))
  })

export default threadsSlice.reducer
