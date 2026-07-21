import { createSlice } from "@reduxjs/toolkit"

import ct from "@constants/"

const MAX_EVENT_ENTRIES = 200

const createEventId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const normalizeThreadId = (threadId) => {
  if (threadId === null || threadId === undefined) {
    return null
  }

  return String(threadId)
}

const normalizeChunkTimestamp = (timestamp) => {
  if (typeof timestamp === "number") {
    return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
  }

  if (typeof timestamp === "string") {
    const parsed = Number(timestamp)

    if (!Number.isNaN(parsed)) {
      return parsed < 1_000_000_000_000 ? parsed * 1000 : parsed
    }

    return timestamp
  }

  return Date.now()
}

const normalizeStreamEventEntry = (payload = {}) => ({
  id: payload.id || createEventId(),
  event: payload.event || "unknown",
  threadId: normalizeThreadId(payload.thread_id || payload.threadId),
  runId: payload.run_id || payload.runId || null,
  timestamp: normalizeChunkTimestamp(payload.timestamp),
  payload,
})

const initialState = {
  entries: [],
  activeThreadId: null,
  isStreaming: false,
}

const eventsSlice = createSlice({
  name: ct.store.EVENTS_STORE,
  initialState,
  reducers: {
    beginStreamEvents: (state, action) => {
      state.entries = []
      state.activeThreadId = normalizeThreadId(action.payload)
      state.isStreaming = true
    },
    recordStreamEvent: (state, action) => {
      state.entries.unshift(normalizeStreamEventEntry(action.payload))
      if (state.entries.length > MAX_EVENT_ENTRIES) {
        state.entries.length = MAX_EVENT_ENTRIES
      }
    },
    finishStreamEvents: (state, action) => {
      state.isStreaming = false
      if (action.payload !== undefined) {
        state.activeThreadId = normalizeThreadId(action.payload)
      }
    },
    clearEvents: (state) => {
      state.entries = []
      state.activeThreadId = null
      state.isStreaming = false
    },
  },
})

export const {
  beginStreamEvents,
  recordStreamEvent,
  finishStreamEvents,
  clearEvents,
} = eventsSlice.actions

export default eventsSlice.reducer
