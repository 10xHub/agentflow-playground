import { notifyError } from "@/lib/notify"
import { getTenxGraphClient } from "@/lib/tenxgraph-client"

import { switchThread, threadHistoryLoaded } from "./chat-slice"

// Server history -> Chat messages. Stored messages are user / assistant / tool
// rows; Chat shows one agent turn per run of non-user rows.

const PAGE = 100
const MAX_PAGES = 10 // history cap: 1000 messages

const pretty = (value) =>
  typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2)

const textOf = (content) => {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content
    .filter((b) => b?.type === "text")
    .map((b) => b.text || "")
    .join("\n\n")
}

const reasoning = (b, key) => ({
  _key: key,
  kind: "reasoning",
  summary: "Model reasoning",
  text: b.summary || b.details || b.text || "",
  collapsed: true,
})

const toolCall = (b, key) => ({
  _key: key,
  kind: "tool_call",
  callId: b.id,
  name: b.name,
  code: pretty(b.args ?? {}),
  collapsed: false,
})

const toolResult = (b, key) => ({
  _key: key,
  kind: "tool_result",
  callId: b.call_id,
  name: b.name || "result",
  code: pretty(b.output ?? b.content ?? {}),
  isError: Boolean(b.is_error),
  collapsed: true,
})

const BUILDERS = { reasoning, tool_call: toolCall, tool_result: toolResult }

// A tool row's name lives in its metadata, not in the tool_result block.
const withToolName = (b, msg) =>
  b?.type === "tool_result" && !b.name
    ? { ...b, name: msg.metadata?.function_name }
    : b

// Message-level tools_calls ({ id, function: { name, arguments } }) is the
// fallback when the content has no tool_call blocks.
const fromToolsCalls = (calls, index) =>
  calls.map((c, i) =>
    toolCall(
      {
        id: c.id,
        name: c.function?.name,
        args: parseArgs(c.function?.arguments),
      },
      `tool_call:${index}:t${i}`
    )
  )

const parseArgs = (value) => {
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

// Blocks of one stored message; plain-string tool rows become one result block.
const blocksOf = (msg, index) => {
  if (Array.isArray(msg.content)) {
    const blocks = msg.content.flatMap((b, i) => {
      const build = BUILDERS[b?.type]
      return build
        ? [build(withToolName(b, msg), `${b.type}:${index}:${i}`)]
        : []
    })
    const hasCalls = blocks.some((b) => b.kind === "tool_call")
    if (!hasCalls && Array.isArray(msg.tools_calls)) {
      blocks.push(...fromToolsCalls(msg.tools_calls, index))
    }
    return blocks
  }
  if (msg.role === "tool" && msg.content) {
    return [
      toolResult(
        {
          call_id: msg.metadata?.tool_call_id,
          name: msg.metadata?.function_name,
          output: msg.content,
        },
        `tool_result:${index}`
      ),
    ]
  }
  return Array.isArray(msg.tools_calls)
    ? fromToolsCalls(msg.tools_calls, index)
    : []
}

const agentTurn = (msg, index) => ({
  id: msg.message_id || `hist-agent-${index}`,
  role: "agent",
  who: "graph.react",
  node: "agent",
  blocks: [],
  answer: [],
  streaming: false,
  runMeta: null,
})

const timeOf = (msg) => {
  if (!msg.timestamp) return ""
  const d = new Date(msg.timestamp * 1000)
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString([], { hour12: false })
}

/** Map stored API messages to the message shape Chat renders. */
export const mapStoredMessages = (stored = []) => {
  const out = []
  let turn = null
  let texts = []
  const close = () => {
    if (turn && texts.length) turn.answer = [texts.join("\n\n")]
    turn = null
    texts = []
  }
  stored.forEach((msg, index) => {
    if (msg.role === "system") return
    if (msg.role === "user") {
      close()
      out.push({
        id: msg.message_id || `hist-user-${index}`,
        role: "user",
        who: "You",
        time: timeOf(msg),
        text: textOf(msg.content),
      })
      return
    }
    if (!turn) {
      turn = agentTurn(msg, index)
      out.push(turn)
    }
    const text = msg.role === "assistant" ? textOf(msg.content) : ""
    if (text) texts.push(text)
    turn.blocks.push(...blocksOf(msg, index))
  })
  close()
  return out
}

const fetchAll = async (client, threadId) => {
  const all = []
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const res = await client.threadMessages(threadId, {
      offset: all.length,
      limit: PAGE,
    })
    const batch = (res?.data || res)?.messages || []
    all.push(...batch)
    if (batch.length < PAGE) break
  }
  return all
}

let latest = 0 // the newest open request wins

/**
 * Make a server thread the active Chat thread. A cached copy shows at once; the
 * server history then replaces it. Resolves true once the thread is active.
 */
export const openServerThread =
  (threadId, { title } = {}) =>
  async (dispatch, getState) => {
    const chat = () => getState().chat
    if (!threadId || chat().generating) return false
    const mine = ++latest
    if (chat().threads.byId[threadId]) dispatch(switchThread(threadId))
    try {
      const stored = await fetchAll(getTenxGraphClient(), threadId)
      if (mine !== latest) return false
      dispatch(
        threadHistoryLoaded({
          id: threadId,
          title,
          messages: mapStoredMessages(stored),
        })
      )
      return true
    } catch (e) {
      if (mine !== latest) return false
      // A cached copy is already showing; otherwise leave Chat as it was.
      const shown = chat().threadId === threadId
      notifyError("Could not load thread history", e)
      return shown
    }
  }
