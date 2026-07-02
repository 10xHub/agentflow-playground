import { createSlice } from "@reduxjs/toolkit"

import { loadThreads, saveThreads } from "./threadsCache"

// UI-shaped chat state. Messages are stored in the exact shape the existing
// <Message>/<ContentBlock> components render, so streaming updates flow straight
// to the view. Blocks: { kind:"reasoning"|"tool_call"|"tool_result", ... }.
//
// The inspector panes read the *live* interaction: `events` (decoded stream
// chunks), `frames` (raw send/receive frames), `graphInfo` (from client.graph()),
// and `lastRequest` (used to render a real, copy-pasteable cURL).
//
// Threads: `messages` holds the ACTIVE thread's live list; `threads` is a cache
// (order + byId) of every thread this browser has touched, persisted to
// localStorage so switching and refresh both restore prior conversations. Before
// the server assigns an id, the active thread lives under `DRAFT_ID`.

const MAX_LOG = 200 // cap event/frame logs so long runs don't grow unbounded

export const DRAFT_ID = "__draft__" // active-but-unassigned thread key

const persisted = loadThreads()

const initialState = {
  // messages[]: user  -> { id, role:"user", who, time, text }
  //             agent -> { id, role:"agent", who, node, blocks:[], answer:[], streaming, runMeta }
  messages: persisted.activeId ? persisted.byId[persisted.activeId]?.messages || [] : [],
  generating: false,
  error: null,
  threadId: persisted.activeId && persisted.activeId !== DRAFT_ID ? persisted.activeId : null,

  // Thread cache (persisted).
  threads: { order: persisted.order || [], byId: persisted.byId || {} },

  // Run configuration surfaced in the header, consumed by the thunk.
  mode: "stream", // "invoke" | "stream" | "ws"
  granularity: "low", // "full" | "partial" | "low"

  // Live inspector data — reset at the start of each run.
  events: [], // { type, node, time, detail }
  frames: [], // { dir:"out"|"in", label, time }
  graphInfo: null, // structure from client.graph()
  lastRequest: null, // { method, url, headers, body, mode } for the cURL pane
  runStartedAt: null,
}

const findAgent = (state, id) =>
  state.messages.find((m) => m.id === id && m.role === "agent")

// Derive a short title from the first user message.
const titleFor = (messages) => {
  const first = messages.find((m) => m.role === "user")
  const t = (first?.text || "New thread").trim()
  return t.length > 42 ? `${t.slice(0, 42)}…` : t || "New thread"
}

// Write the active thread's messages into the cache under its current key
// (real threadId once assigned, else DRAFT_ID) and persist. Called after any
// mutation so switching/refresh always sees the latest.
const syncActive = (state) => {
  const key = state.threadId || DRAFT_ID
  if (!state.messages.length) return
  const existing = state.threads.byId[key]
  state.threads.byId[key] = {
    id: key,
    title: existing?.title && key !== DRAFT_ID ? existing.title : titleFor(state.messages),
    messages: state.messages,
    updatedAt: existing?.updatedAt || 0,
  }
  // Most-recent-first ordering.
  state.threads.order = [key, ...state.threads.order.filter((id) => id !== key)]
  saveThreads({
    order: state.threads.order,
    byId: state.threads.byId,
    activeId: key,
  })
}

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setThreadId: (state, action) => {
      const newId = action.payload
      const prevKey = state.threadId || DRAFT_ID
      state.threadId = newId
      // Migrate the draft cache entry onto the real id the server just assigned,
      // so the thread persists under a stable, reloadable key.
      if (newId && newId !== prevKey && state.threads.byId[prevKey]) {
        const entry = state.threads.byId[prevKey]
        delete state.threads.byId[prevKey]
        state.threads.byId[newId] = { ...entry, id: newId }
        state.threads.order = state.threads.order.map((id) => (id === prevKey ? newId : id))
      }
      syncActive(state)
    },
    setGenerating: (state, action) => {
      state.generating = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
    },
    setMode: (state, action) => {
      state.mode = action.payload
    },
    setGranularity: (state, action) => {
      state.granularity = action.payload
    },
    setGraphInfo: (state, action) => {
      state.graphInfo = action.payload
    },
    clearChat: (state) => {
      state.messages = []
      state.error = null
      state.events = []
      state.frames = []
      state.lastRequest = null
    },
    // Start a fresh thread: snapshot the current one, then reset the active view.
    newThread: (state) => {
      syncActive(state)
      state.messages = []
      state.threadId = null
      state.error = null
      state.events = []
      state.frames = []
      state.lastRequest = null
      saveThreads({ order: state.threads.order, byId: state.threads.byId, activeId: DRAFT_ID })
    },
    // Load a cached thread into the active view.
    switchThread: (state, action) => {
      const id = action.payload
      syncActive(state) // persist whatever we're leaving
      const entry = state.threads.byId[id]
      if (!entry) return
      state.messages = entry.messages
      state.threadId = id === DRAFT_ID ? null : id
      state.error = null
      state.events = []
      state.frames = []
      state.lastRequest = null
      saveThreads({ order: state.threads.order, byId: state.threads.byId, activeId: id })
    },
    // Remove a thread from the cache; if it was active, fall back to a new draft.
    removeThread: (state, action) => {
      const id = action.payload
      delete state.threads.byId[id]
      state.threads.order = state.threads.order.filter((t) => t !== id)
      const wasActive = (state.threadId || DRAFT_ID) === id
      if (wasActive) {
        state.messages = []
        state.threadId = null
      }
      saveThreads({
        order: state.threads.order,
        byId: state.threads.byId,
        activeId: wasActive ? DRAFT_ID : state.threadId || DRAFT_ID,
      })
    },
    addUserMessage: (state, action) => {
      const { id, text, time } = action.payload
      state.messages.push({ id, role: "user", who: "You", time, text })
      syncActive(state)
    },
    // Create (or reset) the assistant turn that streaming will fill in.
    startAgentTurn: (state, action) => {
      const { id, who, node } = action.payload
      state.messages.push({
        id,
        role: "agent",
        who: who || "graph.react",
        node: node || "agent",
        blocks: [],
        answer: [],
        streaming: true,
        runMeta: null,
      })
    },
    setAgentNode: (state, action) => {
      const { id, node } = action.payload
      const m = findAgent(state, id)
      if (m && node) m.node = node
    },
    // Append or replace the streamed assistant text. `mode:"append"` for deltas,
    // `mode:"replace"` for full snapshots. Stored as a single-paragraph array.
    setAgentText: (state, action) => {
      const { id, text, mode = "append" } = action.payload
      const m = findAgent(state, id)
      if (!m) return
      const current = m.answer[0] || ""
      m.answer = [mode === "replace" ? text : current + text]
      syncActive(state)
    },
    // Upsert a reasoning / tool_call / tool_result block by a stable key.
    upsertBlock: (state, action) => {
      const { id, key, block } = action.payload
      const m = findAgent(state, id)
      if (!m) return
      const existing = m.blocks.find((b) => b._key === key)
      if (existing) Object.assign(existing, block)
      else m.blocks.push({ _key: key, ...block })
    },
    // Accumulate token usage across a run (a turn may make several LLM calls).
    addUsage: (state, action) => {
      const { id, usage } = action.payload
      const m = findAgent(state, id)
      if (!m || !usage) return
      const u = m.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        reasoning_tokens: 0,
        calls: 0,
      }
      u.prompt_tokens += usage.prompt_tokens || 0
      u.completion_tokens += usage.completion_tokens || 0
      u.total_tokens += usage.total_tokens || 0
      u.reasoning_tokens += usage.reasoning_tokens || 0
      u.calls += 1
      m.usage = u
    },
    finishAgentTurn: (state, action) => {
      const { id, runMeta } = action.payload
      const m = findAgent(state, id)
      if (!m) return
      m.streaming = false
      if (runMeta) {
        // Fold the accumulated usage into the run meta the view reads.
        m.runMeta = m.usage ? { ...runMeta, usage: m.usage } : runMeta
      }
      // Bump updatedAt and persist the completed turn.
      const key = state.threadId || DRAFT_ID
      if (state.threads.byId[key]) state.threads.byId[key].updatedAt = m.runMeta?.finishedAt || 0
      syncActive(state)
    },
    appendErrorAnswer: (state, action) => {
      const { id, text } = action.payload
      const m = findAgent(state, id)
      if (m) m.answer = [text]
    },

    // --- Inspector logging ---------------------------------------------------
    beginRun: (state, action) => {
      // Reset the live panes for a fresh interaction.
      state.events = []
      state.frames = []
      state.lastRequest = action.payload?.request || null
      state.runStartedAt = action.payload?.startedAt || null
    },
    pushEvent: (state, action) => {
      state.events.unshift(action.payload) // newest first
      if (state.events.length > MAX_LOG) state.events.length = MAX_LOG
    },
    pushFrame: (state, action) => {
      state.frames.push(action.payload) // chronological
      if (state.frames.length > MAX_LOG) state.frames.splice(0, state.frames.length - MAX_LOG)
    },
  },
})

export const {
  setThreadId,
  setGenerating,
  setError,
  setMode,
  setGranularity,
  setGraphInfo,
  clearChat,
  newThread,
  switchThread,
  removeThread,
  addUserMessage,
  startAgentTurn,
  setAgentNode,
  setAgentText,
  upsertBlock,
  addUsage,
  finishAgentTurn,
  appendErrorAnswer,
  beginRun,
  pushEvent,
  pushFrame,
} = chatSlice.actions

export default chatSlice.reducer
