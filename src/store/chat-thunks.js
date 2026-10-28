import { Message } from "10xgraph-client"

import { buildAttachmentMessage } from "@/lib/chat-attachments"
import { isClientToolHandled } from "@/lib/client-tool-handlers"
import { isDemoActive } from "@/lib/demo/demo-mode"
import {
  interruptFromChunk,
  isStaticPause,
  pauseFromChunk,
  remoteToolNames,
  savedPause,
  unhandledPause,
} from "@/lib/interrupt"
import { notifyError, notifySuccess } from "@/lib/notify"
import { resolveRunOptions } from "@/lib/run-options"
import { getCurrentSettings } from "@/lib/settings-utils"
import { getTenxGraphClient } from "@/lib/tenxgraph-client"

import {
  addUsage,
  addUserMessage,
  appendErrorAnswer,
  beginRun,
  clearPendingInterrupt,
  finishAgentTurn,
  newThread,
  pushEvent,
  pushFrame,
  setAgentNode,
  setAgentText,
  setError,
  setGenerating,
  setGraphInfo,
  setInterruptBusy,
  setInterruptError,
  setMode,
  setPendingInterrupt,
  setThreadId,
  startAgentTurn,
  upsertBlock,
} from "./chat-slice"

// The active run's AbortController lives outside Redux (non-serializable). Stop
// aborts it; the stream loop checks signal.aborted and bails.
let activeAbort = null

/**
 * Abandon the in-flight run without touching chat state. Used when the app
 * enters or leaves the demo, right before every slice is reset: the old run's
 * remaining chunks must not land in (or be saved from) the new session.
 */
export const abortActiveRun = () => {
  if (!activeAbort) return
  activeAbort.abandoned = true
  activeAbort.abort()
}

const NOT_CONNECTED = "Not connected to a backend"

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
    callId: block.id,
    name: block.name,
    code: pretty(block.args ?? {}),
    collapsed: false,
  },
})

// A call the browser runs itself (a client tool registered in the Tools page).
const remoteToolCallBlock = (block, index) => ({
  key: `tool_call:${block.id || block.name || index}`,
  block: {
    kind: "tool_call",
    callId: block.id,
    name: block.name,
    code: pretty(block.args ?? {}),
    remote: true,
    collapsed: false,
  },
})

const toolResultBlock = (block, index) => ({
  key: `tool_result:${block.call_id || block.id || index}`,
  block: {
    kind: "tool_result",
    callId: block.call_id,
    name: block.name || "result",
    code: pretty(block.output ?? block.content ?? {}),
    isError: Boolean(block.is_error),
    collapsed: true,
  },
})

const BLOCK_BUILDERS = new Map([
  ["reasoning", reasoningBlock],
  ["tool_call", toolCallBlock],
  ["remote_tool_call", remoteToolCallBlock],
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
        callId: message.metadata?.tool_call_id,
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
// The demo's cURL targets a local `10xgraph api` (default port), never the
// visitor's own saved server or its auth.
const DEMO_BASE_URL = "http://localhost:8000"

const buildRequestSnapshot = (mode, messages, run, granularity) => {
  const settings = isDemoActive()
    ? { backendUrl: DEMO_BASE_URL }
    : getCurrentSettings()
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

// Ask the server to stop the thread's run. The AbortSignal cancels the request
// itself; this tells the server to stop work it may already be doing.
const requestServerStop = async (controller, threadId) => {
  if (!threadId || controller?.stopSent) return
  if (controller) controller.stopSent = true
  try {
    await getTenxGraphClient().stopGraph(threadId)
  } catch (e) {
    notifyError("Could not stop the run", e)
  }
}

// Stop landed before the thread id was known: take it from this chunk.
const stopOnAbort = (controller, getState, chunk) =>
  requestServerStop(
    controller,
    getState().chat.threadId || chunk?.thread_id || chunk?.metadata?.thread_id
  )

// Consume the async chunk stream (shared by "stream" and "ws" modes) and fan the
// chunks out into messages + inspector logs. Returns whether any text was seen.

// Note the pause a chunk announces. A remote_tool pause only counts if the
// stream ends there: the client SDK runs the tool and keeps streaming, so the
// next chunk drops it. It is also skipped when a handler runs the tool.
const trackPause = (chunk, outcome, tools) => {
  if (!outcome) return
  if (outcome.interrupt?.kind === "remote_tool") delete outcome.interrupt
  const names = remoteToolNames(chunk?.message)
  if (names.length > 0) tools.names = names
  const pause = unhandledPause(
    pauseFromChunk(chunk),
    tools.names,
    isClientToolHandled
  )
  const interrupt = interruptFromChunk(chunk) || pause
  if (interrupt) outcome.interrupt = interrupt
}

const consumeStream = async (
  stream,
  { dispatch, getState, agentId, startedAt, signal, controller, outcome }
) => {
  let sawText = false
  const tools = { names: [] }
  for await (const chunk of stream) {
    if (signal?.aborted) {
      await stopOnAbort(controller, getState, chunk)
      break
    }

    logChunk(dispatch, chunk, startedAt)
    syncThreadId(dispatch, getState, chunk)
    syncAgentNode(dispatch, agentId, chunk)
    throwIfErrorChunk(chunk)

    trackPause(chunk, outcome, tools)

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
    client = getTenxGraphClient()
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
  // Aborting stops the UI side; the server is asked to stop too. Without a
  // thread id yet, consumeStream asks once the first chunk carries it.
  const controller = activeAbort
  if (controller) controller.abort()
  await requestServerStop(controller, getState().chat.threadId)
  dispatch(setGenerating(false))
}

/** Re-run the "fix thread" recovery endpoint for the current thread. */
export const fixThread = () => async (dispatch, getState) => {
  const { threadId } = getState().chat
  if (!threadId) return
  try {
    const res = await getTenxGraphClient().fixGraph(threadId)
    dispatch(setError(null))
    const removed = (res?.data || res)?.removed_count
    notifySuccess(
      "Thread fixed",
      typeof removed === "number" ? `Removed ${removed} message(s).` : undefined
    )
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
  { agentId, granularity, mode, outgoing, run, startedAt, trimmed, attachments }
) => {
  dispatch(
    addUserMessage({
      id: uid("user"),
      text: trimmed,
      time: nowTime(),
      attachments,
    })
  )
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
  { dispatch, agentId, startedAt, signal, outcome }
) => {
  const result = await client.invoke(outgoing, { ...clientOptions, signal })
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

  // Best effort: the invoke body carries the pause only as saved state, and
  // only when the granularity returns it.
  const interrupt = savedPause(result?.state, isClientToolHandled)
  if (interrupt) outcome.interrupt = interrupt

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
    return consumeStream(
      client.wsStream(outgoing, { ...clientOptions, signal: ctx.signal }),
      ctx
    )
  }
  return consumeStream(
    client.stream(outgoing, { ...clientOptions, signal: ctx.signal }),
    ctx
  )
}

// Close out a run that completed without throwing.
const finishRun = (dispatch, { agentId, mode, sawText, signal, outcome }) => {
  if (signal.aborted) {
    dispatch(
      finishAgentTurn({
        id: agentId,
        runMeta: { status: "stopped", path: mode },
      })
    )
    return
  }
  // A paused run is waiting for an answer, not finished.
  if (outcome?.interrupt) {
    dispatch(
      finishAgentTurn({
        id: agentId,
        runMeta: { status: "interrupted", path: mode },
      })
    )
    dispatch(
      setPendingInterrupt({ interrupt: outcome.interrupt, turnId: agentId })
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
const isAbort = (e, signal) => signal.aborted || e?.name === "AbortError"

export const WS_UNAVAILABLE_MESSAGE =
  "This server can't serve WebSocket. Install 10xgraph-api[websocket] or switch to Stream mode."

// The SDK reports a refused upgrade only as this generic message.
const friendlyError = (e, mode) =>
  mode === "ws" && /WebSocket connection failed/i.test(e?.message || "")
    ? WS_UNAVAILABLE_MESSAGE
    : e?.message

const failRun = (dispatch, e, { agentId, mode, signal, startedAt }) => {
  if (isAbort(e, signal)) {
    dispatch(
      finishAgentTurn({
        id: agentId,
        runMeta: { status: "stopped", path: mode },
      })
    )
    return
  }
  const reason = friendlyError(e, mode) || e
  dispatch(appendErrorAnswer({ id: agentId, text: `Error: ${reason}` }))
  dispatch(finishAgentTurn({ id: agentId, runMeta: { status: "error" } }))
  dispatch(setError(friendlyError(e, mode) || "Stream failed"))
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
// Run under a fresh AbortController and close the turn out. An abandoned run
// (abortActiveRun) dispatches nothing more: its state has already been reset.
// A stream or ws run that ended with no abort and no interrupt chunk seen.
const endedQuietly = (signal, outcome, mode) =>
  !signal.aborted && !outcome.interrupt && mode !== "invoke" && !isDemoActive()

const runAndSettle = async (
  client,
  mode,
  outgoing,
  clientOptions,
  base,
  execute = executeRun
) => {
  const { dispatch, agentId, startedAt } = base
  const outcome = {}
  let completed = false
  const controller = new AbortController()
  activeAbort = controller
  const { signal } = controller
  try {
    const sawText = await execute(client, mode, outgoing, clientOptions, {
      ...base,
      signal,
      controller,
      outcome,
    })
    if (!controller.abandoned) {
      finishRun(dispatch, { agentId, mode, sawText, signal, outcome })
      completed = endedQuietly(signal, outcome, mode)
    }
  } catch (e) {
    const handled = base.handleError?.(e, signal)
    if (!controller.abandoned && !handled) {
      failRun(dispatch, e, { agentId, mode, signal, startedAt })
    }
  } finally {
    // A newer run may own activeAbort by now (after an abandon).
    if (activeAbort === controller) activeAbort = null
    if (!controller.abandoned) dispatch(setGenerating(false))
  }
  // Low granularity may omit the "interrupted" chunk: ask the thread's saved
  // state whether the finished stream actually paused.
  if (completed) {
    await dispatch(loadPendingInterrupt({ turnId: agentId, mode }))
  }
}

export const sendMessage =
  (text, attachments = []) =>
  async (dispatch, getState) => {
    const trimmed = (text || "").trim()
    if (!trimmed && attachments.length === 0) return
    if (getState().chat.generating) return
    dispatch(clearPendingInterrupt())

    let client
    try {
      client = getTenxGraphClient()
    } catch (e) {
      dispatch(setError(e?.message || NOT_CONNECTED))
      return
    }

    const { mode, granularity, runOptions, threadId } = getState().chat
    const startedAt = Date.now()
    const outgoing = [
      attachments.length > 0
        ? buildAttachmentMessage(trimmed, attachments)
        : Message.text_message(trimmed, "user"),
    ]

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
      attachments,
    })

    await runAndSettle(client, mode, outgoing, clientOptions, {
      dispatch,
      getState,
      agentId,
      startedAt,
    })
  }

/**
 * Demo mode: replay a recorded run through the normal send path, so frames,
 * events, the inspector and Stop behave exactly as they do on a live server.
 * A run from a different recorded thread starts a new chat thread.
 */
export const sendDemoRun = (run) => async (dispatch, getState) => {
  const { threadId, messages } = getState().chat
  if (messages.length > 0 && threadId !== run.threadId) dispatch(newThread())
  getTenxGraphClient().queueRun(run.id)
  dispatch(setMode("stream"))
  await dispatch(sendMessage(run.prompt))
}

// Resume goes out as soon as the stream opens; nothing is added to the
// transcript until the server accepts it, so a 409 or 422 leaves the card as
// it was. Returns whether the resumed run produced text.
const executeResume = async (client, mode, outgoing, clientOptions, ctx) => {
  const withSignal = { ...clientOptions, signal: ctx.signal }
  const source =
    mode === "ws"
      ? client.wsStream(outgoing, withSignal)
      : client.stream(outgoing, withSignal)
  const iterator = source[Symbol.asyncIterator]()
  const first = await iterator.next()
  ctx.begin()
  const replay = (async function* replayChunks() {
    if (first.done) return
    yield first.value
    for (let next = await iterator.next(); !next.done; ) {
      yield next.value
      next = await iterator.next()
    }
  })()
  return consumeStream(replay, ctx)
}

// Take the answered turn out of "needs input" and open the continuation turn.
const beginResumedTurn = (dispatch, { pending, agentId, value, mode }) => {
  if (pending.turnId) {
    dispatch(
      finishAgentTurn({
        id: pending.turnId,
        runMeta: {
          status: value === null ? "rejected" : "answered",
          path: mode,
        },
      })
    )
  }
  dispatch(clearPendingInterrupt())
  dispatch(startAgentTurn({ id: agentId }))
  dispatch(setError(null))
  dispatch(
    pushFrame({
      dir: "out",
      label:
        mode === "ws"
          ? "WS /v1/graph/ws (resume)"
          : "POST /v1/graph/stream (resume)",
      time: nowTime(),
    })
  )
}

// The request that continues a pause. interrupt_before / interrupt_after have
// no answer to give: an empty resume (null, no interrupt_id) continues the run
// and adds no message to the thread.
const resumeRequest = ({ pending, value, run, granularity }) => {
  const clientOptions = buildClientOptions(run, granularity)
  delete clientOptions.initial_state
  if (isStaticPause(pending.interrupt)) {
    return { outgoing: [], clientOptions: { ...clientOptions, resume: null } }
  }
  return {
    outgoing: [],
    clientOptions: {
      ...clientOptions,
      resume: value,
      interrupt_id: pending.interrupt.id,
    },
  }
}

/**
 * Answer the open interrupt and continue the same thread over the stream.
 * `value` is the resume payload; null cancels (reject). Only meaningful in
 * stream mode, where the pause was received.
 */
export const resumeRun = (value) => async (dispatch, getState) => {
  const { pendingInterrupt: pending, generating, mode } = getState().chat
  if (!pending || generating || mode === "invoke") return
  // A client-tool wait ends when the browser sends the result, not here.
  if (pending.interrupt.kind === "remote_tool") return

  let client
  try {
    client = getTenxGraphClient()
  } catch (e) {
    dispatch(setInterruptError(e?.message || NOT_CONNECTED))
    return
  }

  const { granularity, runOptions, threadId } = getState().chat
  const run = resolveRunOptions(runOptions, threadId)
  if (!run.valid) {
    const [[field, message]] = Object.entries(run.errors)
    dispatch(setInterruptError(`Run options, ${field}: ${message}`))
    return
  }

  const agentId = uid("agent")
  const startedAt = Date.now()
  const { outgoing, clientOptions } = resumeRequest({
    pending,
    value,
    run,
    granularity,
  })

  dispatch(setInterruptBusy(true))
  dispatch(setGenerating(true))
  let begun = false
  await runAndSettle(
    client,
    mode,
    outgoing,
    clientOptions,
    {
      dispatch,
      getState,
      agentId,
      startedAt,
      begin: () => {
        begun = true
        beginResumedTurn(dispatch, { pending, agentId, value, mode })
      },
      // Before the stream opens the failure belongs to the card, not the transcript.
      handleError: (e, signal) => {
        if (begun) return false
        dispatch(
          isAbort(e, signal)
            ? setInterruptBusy(false)
            : setInterruptError(e?.message || "Resume failed")
        )
        return true
      },
    },
    executeResume
  )
}

/**
 * After a reload or thread switch, offer the interrupt the thread is paused at
 * (read from its saved state). Quiet when there is none or the lookup fails.
 */
export const loadPendingInterrupt =
  ({ turnId, mode } = {}) =>
  async (dispatch, getState) => {
    const start = getState().chat
    if (!start.threadId || start.generating || start.pendingInterrupt) return
    let res
    try {
      res = await getTenxGraphClient().threadState(start.threadId)
    } catch {
      return
    }
    const now = getState().chat
    if (now.threadId !== start.threadId || now.generating) return
    if (now.pendingInterrupt) return
    const interrupt = savedPause(res, isClientToolHandled)
    if (!interrupt) return
    if (turnId) {
      dispatch(
        finishAgentTurn({
          id: turnId,
          runMeta: { status: "interrupted", path: mode },
        })
      )
    }
    dispatch(setPendingInterrupt({ interrupt, turnId }))
  }
