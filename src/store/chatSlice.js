import { createSlice } from "@reduxjs/toolkit"

// UI-shaped chat state. Messages are stored in the exact shape the existing
// <Message>/<ContentBlock> components render, so streaming updates flow straight
// to the view. Blocks: { kind:"reasoning"|"tool_call"|"tool_result", ... }.

const initialState = {
  // messages[]: user  -> { id, role:"user", who, time, text }
  //             agent -> { id, role:"agent", who, node, blocks:[], answer:[], streaming, runMeta }
  messages: [],
  generating: false,
  error: null,
  threadId: null,
}

const findAgent = (state, id) =>
  state.messages.find((m) => m.id === id && m.role === "agent")

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setThreadId: (state, action) => {
      state.threadId = action.payload
    },
    setGenerating: (state, action) => {
      state.generating = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
    },
    clearChat: (state) => {
      state.messages = []
      state.error = null
    },
    addUserMessage: (state, action) => {
      const { id, text, time } = action.payload
      state.messages.push({ id, role: "user", who: "You", time, text })
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
    finishAgentTurn: (state, action) => {
      const { id, runMeta } = action.payload
      const m = findAgent(state, id)
      if (!m) return
      m.streaming = false
      if (runMeta) m.runMeta = runMeta
    },
    appendErrorAnswer: (state, action) => {
      const { id, text } = action.payload
      const m = findAgent(state, id)
      if (m) m.answer = [text]
    },
  },
})

export const {
  setThreadId,
  setGenerating,
  setError,
  clearChat,
  addUserMessage,
  startAgentTurn,
  setAgentNode,
  setAgentText,
  upsertBlock,
  finishAgentTurn,
  appendErrorAnswer,
} = chatSlice.actions

export default chatSlice.reducer
