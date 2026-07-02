import { Message } from "@10xscale/agentflow-client"

import { getAgentFlowClient } from "@/lib/agentflow-client"

import {
  addUserMessage,
  appendErrorAnswer,
  finishAgentTurn,
  setAgentNode,
  setAgentText,
  setError,
  setGenerating,
  setThreadId,
  startAgentTurn,
  upsertBlock,
} from "./chatSlice"

const nowTime = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

const uid = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

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

/**
 * Send a user message and stream the assistant's reply into the store.
 * Uses the persisted connection (written by ConnectionProvider.connect()).
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

  dispatch(addUserMessage({ id: uid("user"), text: trimmed, time: nowTime() }))

  const agentId = uid("agent")
  dispatch(startAgentTurn({ id: agentId }))
  dispatch(setGenerating(true))
  dispatch(setError(null))

  const threadId = getState().chat.threadId
  const config = threadId ? { thread_id: threadId } : {}

  let sawText = false
  try {
    const stream = client.stream([Message.text_message(trimmed, "user")], {
      config,
      response_granularity: "low",
    })

    for await (const chunk of stream) {
      // Capture / propagate the thread id the server assigns.
      const chunkThreadId = chunk?.thread_id || chunk?.metadata?.thread_id
      if (chunkThreadId && chunkThreadId !== getState().chat.threadId) {
        dispatch(setThreadId(chunkThreadId))
      }

      const node = chunk?.metadata?.node || chunk?.metadata?.current_node
      if (node) dispatch(setAgentNode({ id: agentId, node }))

      // Surface server-side execution errors (bad API key, node failures, …).
      if (chunk?.event === "error") {
        const reason =
          chunk?.data?.reason ||
          chunk?.state?.execution_meta?.internal_data?.error ||
          chunk?.message ||
          "Graph execution error"
        throw new Error(String(reason))
      }

      const message = chunk?.message
      if (!message) continue

      if (message.role === "user") continue

      if (message.role === "tool") {
        emitToolMessage(dispatch, agentId, message)
        continue
      }

      // Assistant message: reasoning/tool_call blocks + text.
      emitContentBlocks(dispatch, agentId, message)

      const text = textFromContent(message.content)
      if (text) {
        sawText = true
        // Deltas append; full snapshots replace. The SDK marks deltas via
        // message.delta — fall back to replace when the flag is absent.
        dispatch(
          setAgentText({
            id: agentId,
            text,
            mode: message.delta ? "append" : "replace",
          })
        )
      }
    }

    dispatch(
      finishAgentTurn({
        id: agentId,
        runMeta: { status: "done", path: "agent" },
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
  } catch (e) {
    dispatch(appendErrorAnswer({ id: agentId, text: `Error: ${e?.message || e}` }))
    dispatch(finishAgentTurn({ id: agentId, runMeta: { status: "error" } }))
    dispatch(setError(e?.message || "Stream failed"))
  } finally {
    dispatch(setGenerating(false))
  }
}
