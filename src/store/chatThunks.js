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
} from "./chatSlice"

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

// Short human summary of a chunk for the events pane detail line.
const summarizeChunk = (chunk) => {
  const message = chunk?.message
  if (message) {
    const text = textFromContent(message.content)
    if (text) return `delta: ${JSON.stringify(text.slice(0, 80))}`
    if (Array.isArray(message.content)) {
      const kinds = message.content.map((b) => b?.type).filter(Boolean)
      if (kinds.length)
        return `${message.role || "message"}: ${kinds.join(", ")}`
    }
    return `${message.role || "message"}`
  }
  if (chunk?.event === "error") return chunk?.data?.reason || "error"
  if (chunk?.state?.execution_meta) {
    const em = chunk.state.execution_meta
    return `current_node: ${em.current_node ?? "?"} · step ${em.step ?? "?"}`
  }
  if (chunk?.data) return pretty(chunk.data).slice(0, 120)
  return chunk?.event || "chunk"
}

// Map assistant/tool content blocks from a streamed message into UI blocks,
// dispatching an upsert for each. Keyed so repeated snapshots update in place.
const emitContentBlocks = (dispatch, agentId, message) => {
  const content = Array.isArray(message?.content) ? message.content : []

  content.forEach((block, index) => {
    if (block?.type === "reasoning") {
      const text = block.summary || block.details || block.text || ""
      dispatch(
        upsertBlock({
          id: agentId,
          key: `reasoning:${index}`,
          block: {
            kind: "reasoning",
            summary: "Model reasoning",
            text,
            collapsed: true,
          },
        })
      )
    } else if (block?.type === "tool_call") {
      dispatch(
        upsertBlock({
          id: agentId,
          key: `tool_call:${block.id || block.name || index}`,
          block: {
            kind: "tool_call",
            name: block.name,
            code: pretty(block.args ?? {}),
            collapsed: false,
          },
        })
      )
    } else if (block?.type === "tool_result") {
      dispatch(
        upsertBlock({
          id: agentId,
          key: `tool_result:${block.call_id || block.id || index}`,
          block: {
            kind: "tool_result",
            name: block.name || "result",
            code: pretty(block.output ?? block.content ?? {}),
            collapsed: true,
          },
        })
      )
    }
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

// Build the { method, url, headers, body } snapshot the cURL pane renders from.
const buildRequestSnapshot = (mode, messages, run, granularity) => {
  const settings = getCurrentSettings()
  const base = (settings.backendUrl || "").replace(/\/$/, "")
  const path = mode === "invoke" ? "/v1/graph/invoke" : "/v1/graph/stream"
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

// Consume the async chunk stream (shared by "stream" and "ws" modes) and fan the
// chunks out into messages + inspector logs. Returns whether any text was seen.
const consumeStream = async (
  stream,
  { dispatch, getState, agentId, startedAt, signal }
) => {
  let sawText = false
  for await (const chunk of stream) {
    if (signal?.aborted) break

    dispatch(
      pushFrame({
        dir: "in",
        label: `event: ${chunk?.event || "chunk"}`,
        time: since(startedAt),
      })
    )
    dispatch(
      pushEvent({
        type: chunk?.event || "chunk",
        node: chunk?.metadata?.node || chunk?.metadata?.current_node || "—",
        time: since(startedAt),
        detail: summarizeChunk(chunk),
      })
    )

    const chunkThreadId = chunk?.thread_id || chunk?.metadata?.thread_id
    if (chunkThreadId && chunkThreadId !== getState().chat.threadId) {
      dispatch(setThreadId(chunkThreadId))
    }

    const node = chunk?.metadata?.node || chunk?.metadata?.current_node
    if (node) dispatch(setAgentNode({ id: agentId, node }))

    if (chunk?.event === "error") {
      const reason =
        chunk?.data?.reason ||
        chunk?.state?.execution_meta?.internal_data?.error ||
        chunk?.message ||
        "Graph execution error"
      throw new Error(String(reason))
    }

    const message = chunk?.message
    if (!message || message.role === "user") continue

    if (message.role === "tool") {
      emitToolMessage(dispatch, agentId, message)
      continue
    }

    emitContentBlocks(dispatch, agentId, message)
    if (message.usages)
      dispatch(addUsage({ id: agentId, usage: message.usages }))

    const text = textFromContent(message.content)
    if (text) {
      sawText = true
      dispatch(
        setAgentText({
          id: agentId,
          text,
          mode: message.delta ? "append" : "replace",
        })
      )
    }
  }
  return sawText
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
    // Merge info (counts/state schema) with the node/edge lists, which sit one
    // level up from `info` in the response.
    const data = res?.data || res || {}
    const info = data.info || {}
    dispatch(
      setGraphInfo({
        ...info,
        nodes: data.nodes || info.nodes || [],
        edges: data.edges || info.edges || [],
      })
    )
  } catch {
    /* non-fatal: inspector Graph tab just stays empty */
  }
}

/** Abort the in-flight run (header/composer Stop button). */
export const stopGeneration = () => async (dispatch, getState) => {
  // Aborting the local iterator is what actually stops the UI stream; the server
  // stopGraph call is best-effort and only exists on newer SDK builds.
  if (activeAbort) activeAbort.abort()
  const threadId = getState().chat.threadId
  if (threadId) {
    try {
      const client = getAgentFlowClient()
      if (typeof client.stopGraph === "function")
        await client.stopGraph(threadId)
    } catch {
      /* best-effort server stop */
    }
  }
  dispatch(setGenerating(false))
}

/** Re-run the "fix thread" recovery endpoint for the current thread. */
export const fixThread = () => async (dispatch, getState) => {
  const threadId = getState().chat.threadId
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

  const { mode, granularity, runOptions } = getState().chat
  const startedAt = Date.now()
  const outgoing = [Message.text_message(trimmed, "user")]
  const threadId = getState().chat.threadId

  // Per-run overrides from the composer popup. Refuse to send malformed JSON
  // rather than silently dropping what the user typed.
  const run = resolveRunOptions(runOptions, threadId)
  if (!run.valid) {
    const [field, message] = Object.entries(run.errors)[0]
    dispatch(setError(`Run options — ${field}: ${message}`))
    return
  }
  const { config } = run
  const clientOptions = {
    config,
    response_granularity: granularity,
    ...(run.initial_state ? { initial_state: run.initial_state } : {}),
    ...(run.recursion_limit ? { recursion_limit: run.recursion_limit } : {}),
  }

  dispatch(addUserMessage({ id: uid("user"), text: trimmed, time: nowTime() }))
  const agentId = uid("agent")
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
    pushFrame({
      dir: "out",
      label: `POST /v1/graph/${mode === "invoke" ? "invoke" : "stream"}${mode === "ws" ? " (ws)" : ""}`,
      time: nowTime(),
    })
  )

  activeAbort = new AbortController()
  const { signal } = activeAbort
  let sawText = false

  try {
    if (mode === "invoke") {
      // Single request/response — no streaming.
      const result = await client.invoke(outgoing, clientOptions)
      dispatch(
        pushFrame({
          dir: "in",
          label: "200 invoke result",
          time: since(startedAt),
        })
      )
      dispatch(
        pushEvent({
          type: "result",
          node: "—",
          time: since(startedAt),
          detail: "invoke complete",
        })
      )

      const resThreadId = result?.thread_id || result?.metadata?.thread_id
      if (resThreadId) dispatch(setThreadId(resThreadId))

      const msgs = result?.messages || result?.data?.messages || []
      msgs
        .filter((m) => m.role !== "user")
        .forEach((m) => {
          if (m.role === "tool") emitToolMessage(dispatch, agentId, m)
          else emitContentBlocks(dispatch, agentId, m)
          if (m.usages) dispatch(addUsage({ id: agentId, usage: m.usages }))
          const t = textFromContent(m.content)
          if (t) {
            sawText = true
            dispatch(setAgentText({ id: agentId, text: t, mode: "replace" }))
          }
        })
    } else if (mode === "ws") {
      if (typeof client.wsStream !== "function") {
        throw new Error(
          "This agentflow-client build does not support WebSocket streaming."
        )
      }
      const stream = client.wsStream(outgoing, clientOptions)
      sawText = await consumeStream(stream, {
        dispatch,
        getState,
        agentId,
        startedAt,
        signal,
      })
    } else {
      const stream = client.stream(outgoing, clientOptions)
      sawText = await consumeStream(stream, {
        dispatch,
        getState,
        agentId,
        startedAt,
        signal,
      })
    }

    if (signal.aborted) {
      dispatch(
        finishAgentTurn({
          id: agentId,
          runMeta: { status: "stopped", path: mode },
        })
      )
    } else {
      dispatch(
        finishAgentTurn({
          id: agentId,
          runMeta: { status: "done", path: mode },
        })
      )
      if (!sawText) {
        dispatch(
          setAgentText({
            id: agentId,
            text: "(no text returned)",
            mode: "replace",
          })
        )
      }
    }
  } catch (e) {
    if (signal.aborted) {
      dispatch(
        finishAgentTurn({
          id: agentId,
          runMeta: { status: "stopped", path: mode },
        })
      )
    } else {
      dispatch(
        appendErrorAnswer({ id: agentId, text: `Error: ${e?.message || e}` })
      )
      dispatch(finishAgentTurn({ id: agentId, runMeta: { status: "error" } }))
      dispatch(setError(e?.message || "Stream failed"))
      dispatch(
        pushEvent({
          type: "error",
          node: "—",
          time: since(startedAt),
          detail: String(e?.message || e),
        })
      )
    }
  } finally {
    activeAbort = null
    dispatch(setGenerating(false))
  }
}
