import { Message } from "@10xscale/agentflow-client"

import { getAgentFlowClient } from "@/lib/agentflow-client"
import { resolveRunOptions } from "@/lib/run-options"
import { getCurrentSettings } from "@/lib/settings-utils"

import {
  addUsage,
  addUserMessage,
  appendErrorAnswer,
  beginRun,
  finishAgentTurn,
  pushEvent,
  pushFrame,
  setAgentNode,
  setAgentText,
  setError,
  setGenerating,
  setGraphInfo,
  setThreadId,
  startAgentTurn,
  upsertBlock,
} from "./chat-slice"

// The active run's AbortController lives outside Redux (non-serializable). Stop
// aborts it; the stream loop checks signal.aborted and bails.
let activeAbort = null

const nowTime = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

const uid = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// "+1.74s" style elapsed label relative to the run start.
const since = (startedAt) => {
  if (!startedAt) return nowTime()
  const s = (Date.now() - startedAt) / 1000
  return `+${s.toFixed(2)}s`
}

// Pull plain text out of a message's content (string or block array).
const textFromContent = (content) => {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .filter((b) => b?.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("")
  }
  return ""
}

// Turn a stringifiable value into pretty JSON for the code panes.
const pretty = (value) => {
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

// Summary line for a chunk that carried a message.
const summarizeMessage = (message) => {
  const text = textFromContent(message.content)
  if (text) return `delta: ${JSON.stringify(text.slice(0, 80))}`
  if (Array.isArray(message.content)) {
    const kinds = message.content.map((b) => b?.type).filter(Boolean)
    if (kinds.length) {
      return `${message.role || "message"}: ${kinds.join(", ")}`
    }
  }
  return `${message.role || "message"}`
}

// Summary line for an error chunk.
const summarizeError = (chunk) => chunk.data?.reason || "error"

// Summary line for a chunk that only carried execution bookkeeping.
const summarizeExecutionMeta = (em) =>
  `current_node: ${em.current_node ?? "?"} · step ${em.step ?? "?"}`

// Short human summary of a chunk for the events pane detail line.
const summarizeChunk = (chunk) => {
  const c = chunk || {}
  if (c.message) return summarizeMessage(c.message)
  if (c.event === "error") return summarizeError(c)
  const em = c.state?.execution_meta
  if (em) return summarizeExecutionMeta(em)
  if (c.data) return pretty(c.data).slice(0, 120)
  return c.event || "chunk"
}

// --- Content block builders ------------------------------------------------
// Each returns the { key, block } half of an upsertBlock payload.

const reasoningBlock = (block, index) => ({
  key: `reasoning:${index}`,
  block: {
    kind: "reasoning",
    summary: "Model reasoning",
    text: block.summary || block.details || block.text || "",
    collapsed: true,
  },
})

const toolCallBlock = (block, index) => ({
  key: `tool_call:${block.id || block.name || index}`,
  block: {
    kind: "tool_call",
    name: block.name,
    code: pretty(block.args ?? {}),
    collapsed: false,
  },
})

const toolResultBlock = (block, index) => ({
  key: `tool_result:${block.call_id || block.id || index}`,
  block: {
    kind: "tool_result",
    name: block.name || "result",
    code: pretty(block.output ?? block.content ?? {}),
    collapsed: true,
  },
})

const BLOCK_BUILDERS = new Map([
  ["reasoning", reasoningBlock],
  ["tool_call", toolCallBlock],
  ["tool_result", toolResultBlock],
])

// Map assistant/tool content blocks from a streamed message into UI blocks,
// dispatching an upsert for each. Keyed so repeated snapshots update in place.
const emitContentBlocks = (dispatch, agentId, message) => {
  const content = Array.isArray(message?.content) ? message.content : []

  content.forEach((block, index) => {
    const build = BLOCK_BUILDERS.get(block?.type)
    if (!build) return
    dispatch(upsertBlock({ id: agentId, ...build(block, index) }))
  })
}

// Also handle tool messages that arrive as role:"tool" with string content.
const emitToolMessage = (dispatch, agentId, message) => {
  if (Array.isArray(message?.content) && message.content.length) {
    emitContentBlocks(dispatch, agentId, message)
    return
  }
  dispatch(
    upsertBlock({
      id: agentId,
      key: `tool_result:${message.message_id || message.id || "tool"}`,
      block: {
        kind: "tool_result",
        name: message.name || "result",
        code: pretty(message.content ?? {}),
        collapsed: true,
      },
    })
  )
}

// Redacted auth headers for the cURL pane — never the real secrets.
const redactedAuthHeaders = (settings) => {
  const headers = { "Content-Type": "application/json" }
  if (settings.authMode === "bearer" && settings.authToken) {
    headers.Authorization = "Bearer •••"
  } else if (settings.auth?.type === "basic") {
    headers.Authorization = "Basic •••"
  } else if (
    settings.authMode === "header" &&
    Array.isArray(settings.headers)
  ) {
    settings.headers.forEach((h) => {
      if (h?.name) headers[h.name] = "•••"
    })
  }
  return headers
}

// Build the { method, url, headers, body } snapshot the cURL pane renders from.
const buildRequestSnapshot = (mode, messages, run, granularity) => {
  const settings = getCurrentSettings()
  const base = (settings.backendUrl || "").replace(/\/$/, "")
  const path = mode === "invoke" ? "/v1/graph/invoke" : "/v1/graph/stream"
  const headers = redactedAuthHeaders(settings)
  return {
    method: "POST",
    mode,
    url: `${base}${path}`,
    headers,
    body: {
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      ...(run.initial_state ? { initial_state: run.initial_state } : {}),
      config: run.config,
      ...(run.recursion_limit ? { recursion_limit: run.recursion_limit } : {}),
      response_granularity: granularity,
    },
  }
}

const chunkEventName = (chunk) => chunk?.event || "chunk"

const chunkNode = (chunk) =>
  chunk?.metadata?.node || chunk?.metadata?.current_node

// Mirror a chunk into the inspector's frames + events panes.
const logChunk = (dispatch, chunk, startedAt) => {
  dispatch(
    pushFrame({
      dir: "in",
      label: `event: ${chunkEventName(chunk)}`,
      time: since(startedAt),
    })
  )
  dispatch(
    pushEvent({
      type: chunkEventName(chunk),
      node: chunkNode(chunk) || "—",
      time: since(startedAt),
      detail: summarizeChunk(chunk),
    })
  )
}

// Adopt the thread id the server assigns mid-stream.
const syncThreadId = (dispatch, getState, chunk) => {
  const chunkThreadId = chunk?.thread_id || chunk?.metadata?.thread_id
  if (chunkThreadId && chunkThreadId !== getState().chat.threadId) {
    dispatch(setThreadId(chunkThreadId))
  }
}

const syncAgentNode = (dispatch, agentId, chunk) => {
  const node = chunkNode(chunk)
  if (node) dispatch(setAgentNode({ id: agentId, node }))
}

// The failure reason can arrive in any of several slots.
const errorChunkReason = (chunk) =>
  chunk.data?.reason ||
  chunk.state?.execution_meta?.internal_data?.error ||
  chunk.message ||
  "Graph execution error"

const throwIfErrorChunk = (chunk) => {
  const c = chunk || {}
  if (c.event !== "error") return
  throw new Error(String(errorChunkReason(c)))
}

// Fan one streamed message out into blocks / usage / text. Returns whether it
// contributed visible text.
const applyChunkMessage = (dispatch, agentId, message) => {
  if (!message || message.role === "user") return false

  if (message.role === "tool") {
    emitToolMessage(dispatch, agentId, message)
    return false
  }

  emitContentBlocks(dispatch, agentId, message)
  if (message.usages) {
    dispatch(addUsage({ id: agentId, usage: message.usages }))
  }

  const text = textFromContent(message.content)
  if (!text) return false
  dispatch(
    setAgentText({
      id: agentId,
      text,
      mode: message.delta ? "append" : "replace",
    })
  )
  return true
}

// Consume the async chunk stream (shared by "stream" and "ws" modes) and fan the
// chunks out into messages + inspector logs. Returns whether any text was seen.
const consumeStream = async (
  stream,
  { dispatch, getState, agentId, startedAt, signal }
) => {
  let sawText = false
  for await (const chunk of stream) {
    if (signal?.aborted) break

    logChunk(dispatch, chunk, startedAt)
    syncThreadId(dispatch, getState, chunk)
    syncAgentNode(dispatch, agentId, chunk)
    throwIfErrorChunk(chunk)

    if (applyChunkMessage(dispatch, agentId, chunk?.message)) sawText = true
  }
  return sawText
}

// Merge info (counts/state schema) with the node/edge lists, which sit one
// level up from `info` in the response.
const normalizeGraphInfo = (res) => {
  const data = res?.data || res || {}
  const info = data.info || {}
  return {
    ...info,
    nodes: data.nodes || info.nodes || [],
    edges: data.edges || info.edges || [],
  }
}

/**
 * Load the graph structure once so the inspector's Graph tab shows real data.
 * Safe to call repeatedly — it just refreshes graphInfo.
 */
export const loadGraphInfo = () => async (dispatch) => {
  let client
  try {
    client = getAgentFlowClient()
  } catch {
    return
  }
  try {
    const res = await client.graph()
    dispatch(setGraphInfo(normalizeGraphInfo(res)))
  } catch {
    /* non-fatal: inspector Graph tab just stays empty */
  }
}

/** Abort the in-flight run (header/composer Stop button). */
export const stopGeneration = () => async (dispatch, getState) => {
  // Aborting the local iterator is what actually stops the UI stream; the server
  // stopGraph call is best-effort and only exists on newer SDK builds.
  if (activeAbort) activeAbort.abort()
  const { threadId } = getState().chat
  if (threadId) {
    try {
      const client = getAgentFlowClient()
      if (typeof client.stopGraph === "function") {
        await client.stopGraph(threadId)
      }
    } catch {
      /* best-effort server stop */
    }
  }
  dispatch(setGenerating(false))
}

/** Re-run the "fix thread" recovery endpoint for the current thread. */
export const fixThread = () => async (dispatch, getState) => {
  const { threadId } = getState().chat
  if (!threadId) return
  try {
    const client = getAgentFlowClient()
    if (typeof client.fixGraph !== "function") {
      dispatch(setError("Fix thread requires a newer agentflow-client build."))
      return
    }
    await client.fixGraph(threadId)
    dispatch(setError(null))
  } catch (e) {
    dispatch(setError(e?.message || "Fix thread failed"))
  }
}

// Per-run overrides from the composer popup, shaped for the client call.
const buildClientOptions = (run, granularity) => ({
  config: run.config,
  response_granularity: granularity,
  ...(run.initial_state ? { initial_state: run.initial_state } : {}),
  ...(run.recursion_limit ? { recursion_limit: run.recursion_limit } : {}),
})

const outboundLabel = (mode) =>
  `POST /v1/graph/${mode === "invoke" ? "invoke" : "stream"}${mode === "ws" ? " (ws)" : ""}`

// Everything that marks the start of a run, in dispatch order.
const startRun = (
  dispatch,
  { agentId, granularity, mode, outgoing, run, startedAt, trimmed }
) => {
  dispatch(addUserMessage({ id: uid("user"), text: trimmed, time: nowTime() }))
  dispatch(startAgentTurn({ id: agentId }))
  dispatch(setGenerating(true))
  dispatch(setError(null))
  dispatch(
    beginRun({
      startedAt,
      request: buildRequestSnapshot(mode, outgoing, run, granularity),
    })
  )
  dispatch(
    pushFrame({ dir: "out", label: outboundLabel(mode), time: nowTime() })
  )
}

const responseThreadId = (result) =>
  result?.thread_id || result?.metadata?.thread_id

const responseMessages = (result) =>
  result?.messages || result?.data?.messages || []

// Fan one invoke-result message out. Returns whether it contributed text.
const applyResultMessage = (dispatch, agentId, m) => {
  if (m.role === "tool") emitToolMessage(dispatch, agentId, m)
  else emitContentBlocks(dispatch, agentId, m)
  if (m.usages) dispatch(addUsage({ id: agentId, usage: m.usages }))
  const t = textFromContent(m.content)
  if (!t) return false
  dispatch(setAgentText({ id: agentId, text: t, mode: "replace" }))
  return true
}

// Single request/response — no streaming.
const runInvoke = async (
  client,
  outgoing,
  clientOptions,
  { dispatch, agentId, startedAt }
) => {
  const result = await client.invoke(outgoing, clientOptions)
  dispatch(
    pushFrame({ dir: "in", label: "200 invoke result", time: since(startedAt) })
  )
  dispatch(
    pushEvent({
      type: "result",
      node: "—",
      time: since(startedAt),
      detail: "invoke complete",
    })
  )

  const resThreadId = responseThreadId(result)
  if (resThreadId) dispatch(setThreadId(resThreadId))

  let sawText = false
  responseMessages(result)
    .filter((m) => m.role !== "user")
    .forEach((m) => {
      if (applyResultMessage(dispatch, agentId, m)) sawText = true
    })
  return sawText
}

// Route the run to the transport the user picked. Returns whether text landed.
const executeRun = async (client, mode, outgoing, clientOptions, ctx) => {
  if (mode === "invoke") return runInvoke(client, outgoing, clientOptions, ctx)
  if (mode === "ws") {
    if (typeof client.wsStream !== "function") {
      throw new Error(
        "This agentflow-client build does not support WebSocket streaming."
      )
    }
    return consumeStream(client.wsStream(outgoing, clientOptions), ctx)
  }
  return consumeStream(client.stream(outgoing, clientOptions), ctx)
}

// Close out a run that completed without throwing.
const finishRun = (dispatch, { agentId, mode, sawText, signal }) => {
  if (signal.aborted) {
    dispatch(
      finishAgentTurn({
        id: agentId,
        runMeta: { status: "stopped", path: mode },
      })
    )
    return
  }
  dispatch(
    finishAgentTurn({ id: agentId, runMeta: { status: "done", path: mode } })
  )
  if (!sawText) {
    dispatch(
      setAgentText({ id: agentId, text: "(no text returned)", mode: "replace" })
    )
  }
}

// Close out a run that threw. An abort is a clean stop, not an error.
const failRun = (dispatch, e, { agentId, mode, signal, startedAt }) => {
  if (signal.aborted) {
    dispatch(
      finishAgentTurn({
        id: agentId,
        runMeta: { status: "stopped", path: mode },
      })
    )
    return
  }
  const reason = e?.message || e
  dispatch(appendErrorAnswer({ id: agentId, text: `Error: ${reason}` }))
  dispatch(finishAgentTurn({ id: agentId, runMeta: { status: "error" } }))
  dispatch(setError(e?.message || "Stream failed"))
  dispatch(
    pushEvent({
      type: "error",
      node: "—",
      time: since(startedAt),
      detail: String(reason),
    })
  )
}

/**
 * Send a user message and stream the assistant's reply into the store, honoring
 * the selected mode (invoke | stream | ws) and response_granularity.
 */
export const sendMessage = (text) => async (dispatch, getState) => {
  const trimmed = (text || "").trim()
  if (!trimmed) return
  if (getState().chat.generating) return

  let client
  try {
    client = getAgentFlowClient()
  } catch (e) {
    dispatch(setError(e?.message || "Not connected to a backend"))
    return
  }

  const { mode, granularity, runOptions, threadId } = getState().chat
  const startedAt = Date.now()
  const outgoing = [Message.text_message(trimmed, "user")]

  // Per-run overrides from the composer popup. Refuse to send malformed JSON
  // rather than silently dropping what the user typed.
  const run = resolveRunOptions(runOptions, threadId)
  if (!run.valid) {
    const [[field, message]] = Object.entries(run.errors)
    dispatch(setError(`Run options — ${field}: ${message}`))
    return
  }
  const clientOptions = buildClientOptions(run, granularity)

  const agentId = uid("agent")
  startRun(dispatch, {
    agentId,
    granularity,
    mode,
    outgoing,
    run,
    startedAt,
    trimmed,
  })

  activeAbort = new AbortController()
  const { signal } = activeAbort
  const ctx = { dispatch, getState, agentId, startedAt, signal }

  try {
    const sawText = await executeRun(client, mode, outgoing, clientOptions, ctx)
    finishRun(dispatch, { agentId, mode, sawText, signal })
  } catch (e) {
    failRun(dispatch, e, { agentId, mode, signal, startedAt })
  } finally {
    activeAbort = null
    dispatch(setGenerating(false))
  }
}
