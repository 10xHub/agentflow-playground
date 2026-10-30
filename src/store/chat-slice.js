import { createSlice } from "@reduxjs/toolkit"

import { loadThreads, saveThreads } from "./threads-cache"

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

const UNTITLED_THREAD = "New thread" // fallback title before a first user message

// A function, so a demoSwitched reset (store/index.js) re-reads the cache for
// whichever mode the app is now in.
const initialState = () => {
  const persisted = loadThreads()
  return {
    // messages[]: user  -> { id, role:"user", who, time, text }
    //             agent -> { id, role:"agent", who, node, blocks:[], answer:[], streaming, runMeta,
    //                        steps:[{ node, round, text, internal?, done? }] }
    //             `steps` is one entry per node execution; each block carries the
    //             index of its step in `step`. Turns saved before steps existed have
    //             neither and render as a flat list.
    messages: persisted.activeId
      ? persisted.byId[persisted.activeId]?.messages || []
      : [],
    generating: false,
    error: null,
    threadId:
      persisted.activeId && persisted.activeId !== DRAFT_ID
        ? persisted.activeId
        : null,

    // Thread cache (persisted).
    threads: { order: persisted.order || [], byId: persisted.byId || {} },

    // Run configuration surfaced in the header, consumed by the thunk.
    mode: "stream", // "invoke" | "stream" | "ws"
    granularity: "low", // "full" | "partial" | "low"

    // Per-run overrides edited in the composer popup. JSON is kept as raw text so
    // a half-typed object survives a reopen; the thunk parses at send time.
    runOptions: {
      initialState: "", // -> initial_state
      config: "", // merged over { thread_id }
      recursionLimit: "", // blank = client default (25)
    },

    // Live inspector data — reset at the start of each run.
    events: [], // { type, node, time, detail }
    frames: [], // { dir:"out"|"in", label, time }
    graphInfo: null, // structure from client.graph()
    lastRequest: null, // { method, url, headers, body, mode } for the cURL pane
    runStartedAt: null,

    // The interrupt() the active thread is paused at, or null:
    // { interrupt, turnId, busy, error }. Not persisted; a reload re-reads
    // it from the thread state.
    pendingInterrupt: null,
  }
}

// The text a delta appends to. Deltas of a different node never glue onto the
// previous node's answer.
const answerBase = (m, step) => {
  const sameNode = !step || !m.answerNode || m.answerNode === step.node
  if (step) m.answerNode = step.node
  return sameNode ? m.answer[0] || "" : ""
}

// The step new content belongs to. A step whose complete message has arrived is
// done; more content from the same node is that node's next run (PLANNER · 2).
const contentStep = (m) => {
  const step = m.steps?.at(-1)
  if (!step?.done) return step
  const round = m.steps.filter((s) => s.node === step.node).length + 1
  const next = { node: step.node, round, text: "" }
  m.steps.push(next)
  return next
}

const findAgent = (state, id) =>
  state.messages.find((m) => m.id === id && m.role === "agent")

// Derive a short title from the first user message.
const titleFor = (messages) => {
  const first = messages.find((m) => m.role === "user")
  const t = (first?.text || UNTITLED_THREAD).trim()
  return t.length > 42 ? `${t.slice(0, 42)}…` : t || UNTITLED_THREAD
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
    title:
      existing?.title && key !== DRAFT_ID
        ? existing.title
        : titleFor(state.messages),
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
      const previousKey = state.threadId || DRAFT_ID
      state.threadId = newId
      // Migrate the draft cache entry onto the real id the server just assigned,
      // so the thread persists under a stable, reloadable key.
      if (newId && newId !== previousKey && state.threads.byId[previousKey]) {
        const entry = state.threads.byId[previousKey]
        delete state.threads.byId[previousKey]
        state.threads.byId[newId] = { ...entry, id: newId }
        state.threads.order = state.threads.order.map((id) =>
          id === previousKey ? newId : id
        )
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
      state.pendingInterrupt = null
    },
    // Swap in a whole thread cache without persisting it: entering the demo hides
    // the visitor's own threads, and leaving it brings them back.
    replaceThreads: (state, action) => {
      const { order = [], byId = {}, activeId = null } = action.payload || {}
      state.threads = { order, byId }
      state.messages = activeId ? byId[activeId]?.messages || [] : []
      state.threadId = activeId && activeId !== DRAFT_ID ? activeId : null
      state.error = null
      state.events = []
      state.frames = []
      state.lastRequest = null
      state.pendingInterrupt = null
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
      state.pendingInterrupt = null
      saveThreads({
        order: state.threads.order,
        byId: state.threads.byId,
        activeId: DRAFT_ID,
      })
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
      state.pendingInterrupt = null
      saveThreads({
        order: state.threads.order,
        byId: state.threads.byId,
        activeId: id,
      })
    },
    // Make a server thread (history already mapped to Chat messages) the active
    // one, replacing any cached copy.
    threadHistoryLoaded: (state, action) => {
      const { id, title, messages } = action.payload
      if ((state.threadId || DRAFT_ID) !== id) syncActive(state)
      state.messages = messages
      state.threadId = id
      state.error = null
      state.events = []
      state.frames = []
      state.lastRequest = null
      state.pendingInterrupt = null
      const existing = state.threads.byId[id]
      state.threads.byId[id] = {
        id,
        title: existing?.title || title || titleFor(messages),
        messages,
        updatedAt: existing?.updatedAt || 0,
      }
      state.threads.order = [id, ...state.threads.order.filter((t) => t !== id)]
      saveThreads({
        order: state.threads.order,
        byId: state.threads.byId,
        activeId: id,
      })
    },
    // Remove a thread from the cache; if it was active, fall back to a new draft.
    removeThread: (state, action) => {
      const id = action.payload
      delete state.threads.byId[id]
      state.threads.order = state.threads.order.filter((t) => t !== id)
      const wasActive = (state.threadId || DRAFT_ID) === id
      if (wasActive) {
        state.pendingInterrupt = null
        state.messages = []
        state.threadId = null
      }
      saveThreads({
        order: state.threads.order,
        byId: state.threads.byId,
        activeId: wasActive ? DRAFT_ID : state.threadId || DRAFT_ID,
      })
    },
    setRunOptions: (state, action) => {
      state.runOptions = { ...state.runOptions, ...action.payload }
    },
    resetRunOptions: (state) => {
      state.runOptions = { initialState: "", config: "", recursionLimit: "" }
    },
    addUserMessage: (state, action) => {
      const { id, text, time, attachments } = action.payload
      const message = { id, role: "user", who: "You", time, text }
      if (attachments?.length) message.attachments = attachments
      state.messages.push(message)
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
        steps: [],
        streaming: true,
        runMeta: null,
      })
    },
    setAgentNode: (state, action) => {
      const { id, node } = action.payload
      const m = findAgent(state, id)
      if (!m || !node) return
      m.node = node
      // A new step starts when the node changes, or the same node runs again
      // after another one. Chunks of the node already running join its step.
      if (!m.steps) m.steps = []
      if (m.steps.at(-1)?.node === node) return
      const round = m.steps.filter((s) => s.node === node).length + 1
      m.steps.push({ node, round, text: "" })
    },
    // Append or replace the streamed assistant text. `mode:"append"` for deltas,
    // `mode:"replace"` for full snapshots. Stored as a single-paragraph array.
    setAgentText: (state, action) => {
      const { id, text, mode = "append", internal } = action.payload
      const m = findAgent(state, id)
      if (!m) return
      const step = contentStep(m)
      if (step) {
        step.text = mode === "replace" ? text : step.text + text
        // `metadata.internal` on the complete message: a review step, not the
        // turn's answer. Deltas of the step show normally until it arrives.
        if (internal) step.internal = true
      }
      const current = answerBase(m, step)
      m.answer = [mode === "replace" ? text : current + text]
      syncActive(state)
    },
    // Upsert a reasoning / tool_call / tool_result block by a stable key.
    upsertBlock: (state, action) => {
      const { id, key, block, append } = action.payload
      const m = findAgent(state, id)
      if (!m) return
      const existing = m.blocks.find((b) => b._key === key)
      if (existing && append && typeof block.text === "string") {
        // Streamed deltas carry only the new piece: grow the row's text.
        const text = (existing.text || "") + block.text
        Object.assign(existing, block, { text })
      } else if (existing) Object.assign(existing, block)
      else {
        contentStep(m)
        const step = m.steps?.length ? { step: m.steps.length - 1 } : {}
        m.blocks.push({ _key: key, ...step, ...block })
      }
    },
    // A node's complete message ends its step: the node's next run is a new step.
    endAgentStep: (state, action) => {
      const m = findAgent(state, action.payload.id)
      const step = m?.steps?.at(-1)
      if (step) step.done = true
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
      if (state.threads.byId[key]) {
        state.threads.byId[key].updatedAt = m.runMeta?.finishedAt || 0
      }
      syncActive(state)
    },
    appendErrorAnswer: (state, action) => {
      const { id, text } = action.payload
      const m = findAgent(state, id)
      if (m) m.answer = [text]
    },

    setPendingInterrupt: (state, action) => {
      const { interrupt, turnId = null } = action.payload
      state.pendingInterrupt = { interrupt, turnId, busy: false, error: null }
    },
    setInterruptBusy: (state, action) => {
      if (!state.pendingInterrupt) return
      state.pendingInterrupt.busy = action.payload
      if (action.payload) state.pendingInterrupt.error = null
    },
    setInterruptError: (state, action) => {
      if (!state.pendingInterrupt) return
      state.pendingInterrupt.busy = false
      state.pendingInterrupt.error = action.payload
    },
    clearPendingInterrupt: (state) => {
      state.pendingInterrupt = null
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
      if (state.frames.length > MAX_LOG) {
        state.frames.splice(0, state.frames.length - MAX_LOG)
      }
    },
  },
})

export const {
  setThreadId,
  setGenerating,
  setError,
  setMode,
  setGranularity,
  setRunOptions,
  resetRunOptions,
  setGraphInfo,
  clearChat,
  newThread,
  replaceThreads,
  switchThread,
  threadHistoryLoaded,
  removeThread,
  addUserMessage,
  startAgentTurn,
  setAgentNode,
  setAgentText,
  endAgentStep,
  upsertBlock,
  addUsage,
  finishAgentTurn,
  appendErrorAnswer,
  setPendingInterrupt,
  setInterruptBusy,
  setInterruptError,
  clearPendingInterrupt,
  beginRun,
  pushEvent,
  pushFrame,
} = chatSlice.actions

export default chatSlice.reducer
