// Pure transcript state for a live session. Kept out of the component so every
// session event maps to one reducer action that can be tested without a socket.

export const initialLiveState = {
  messages: [],
  open: { user: null, agent: null },
  nextId: 1,
  agentName: null,
  goAway: null,
}

const closeOpen = (state) => ({
  ...state,
  open: { user: null, agent: null },
  messages: state.messages.map((m) => (m.done ? m : { ...m, done: true })),
})

const addMessage = (state, message) => ({
  ...state,
  messages: [...state.messages, { ...message, id: state.nextId }],
  nextId: state.nextId + 1,
})

// Coalesce consecutive chunks from one speaker into a bubble until `finished`.
const transcript = (state, { role, text, finished }) => {
  const openId = state.open[role]
  if (openId == null) {
    const next = addMessage(state, { role, text, done: Boolean(finished) })
    return {
      ...next,
      open: { ...next.open, [role]: finished ? null : state.nextId },
    }
  }
  return {
    ...state,
    open: { ...state.open, [role]: finished ? null : openId },
    messages: state.messages.map((m) =>
      m.id === openId
        ? { ...m, text: m.text + text, done: Boolean(finished) }
        : m
    ),
  }
}

const toolResult = (state, { id, result }) => {
  const found = state.messages.some((m) => m.role === "tool" && m.toolId === id)
  if (!found) {
    return addMessage(state, {
      role: "tool",
      toolId: id,
      name: "tool",
      result,
      hasResult: true,
      done: true,
    })
  }
  return {
    ...state,
    messages: state.messages.map((m) =>
      m.role === "tool" && m.toolId === id
        ? { ...m, result, hasResult: true }
        : m
    ),
  }
}

export const liveReducer = (state, action) => {
  switch (action.type) {
    case "reset": {
      return initialLiveState
    }
    case "transcript": {
      return transcript(state, action)
    }
    // Barge-in and turn end both finish whatever bubbles are still streaming.
    case "interrupted":
    case "turn_complete": {
      return closeOpen(state)
    }
    case "tool_call": {
      return addMessage(state, {
        role: "tool",
        toolId: action.id,
        name: action.name,
        args: action.args,
        hasResult: false,
        done: true,
      })
    }
    case "tool_result": {
      return toolResult(state, action)
    }
    case "go_away": {
      return { ...state, goAway: action.timeLeft || "soon" }
    }
    case "agent_changed": {
      return { ...state, agentName: action.author }
    }
    default: {
      return state
    }
  }
}

const stringify = (value) => {
  if (value == null) return ""
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export const formatToolRow = (m) => {
  const call = `${m.name}(${stringify(m.args)})`
  if (!m.hasResult) return call
  return `${call} -> ${stringify(m.result)}`
}

// Bind every session event. `h` carries the side effects the component owns.
export const bindSessionEvents = (session, h) => {
  session.on("open", h.onOpen)
  session.on("audio", h.onAudio)
  session.on("input_transcript", (e) =>
    h.dispatch({
      type: "transcript",
      role: "user",
      text: e.text || "",
      finished: e.finished,
    })
  )
  session.on("output_transcript", (e) =>
    h.dispatch({
      type: "transcript",
      role: "agent",
      text: e.text || "",
      finished: e.finished,
    })
  )
  session.on("interrupted", () => {
    h.flushAudio()
    h.dispatch({ type: "interrupted" })
  })
  session.on("turn_complete", () => h.dispatch({ type: "turn_complete" }))
  session.on("tool_call", (e) =>
    h.dispatch({ type: "tool_call", id: e.id, name: e.name, args: e.args })
  )
  session.on("tool_result", (e) =>
    h.dispatch({ type: "tool_result", id: e.id, result: e.result })
  )
  session.on("go_away", (e) =>
    h.dispatch({ type: "go_away", timeLeft: e.time_left })
  )
  session.on("agent_changed", (e) =>
    h.dispatch({ type: "agent_changed", author: e.author })
  )
  session.on("session_update", (e) => h.onHandle(e.resumption_handle ?? null))
  session.on("error", h.onError)
  session.on("close", h.onClose)
}
