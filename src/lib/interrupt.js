// Helpers for runs that pause. The server reports an interrupt() pause as
// { id, key, node, value, message, reason, response_schema, tool_call_id }, in
// a streamed "updates" chunk and in the saved thread state. The other pauses
// have no Interrupt object: data.pause is "before" or "after" (interrupt_before
// / interrupt_after) or "remote_tool" (waiting on a client tool), and the card
// gets { kind, node, tool? } instead.

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value)

const asInterrupt = (value) =>
  isObject(value) && typeof value.id === "string" ? value : null

/** The interrupt a streamed chunk announces, or null for any other chunk. */
export const interruptFromChunk = (chunk) => {
  if (chunk?.event !== "updates") return null
  if (chunk.data?.status !== "interrupted") return null
  return asInterrupt(chunk.data.interrupt)
}

/**
 * The open interrupt held by a thread state (a threadState response, an invoke
 * result's `state`, or the state object itself), or null.
 */
export const interruptFromState = (res) => {
  const body = res?.data || res || {}
  const state = body.state || body
  const meta = state?.execution_meta
  if (meta?.interrupt_reason !== "interrupt") return null
  return asInterrupt(meta.interrupt_data?.interrupt)
}

const STATIC_KINDS = ["before", "after"]
const PAUSE_KINDS = [...STATIC_KINDS, "remote_tool"]

/** True for the pauses that wait for a plain "continue": an empty resume, no answer or message. */
export const isStaticPause = (pause) => STATIC_KINDS.includes(pause?.kind)

/** The before / after / remote_tool pause a streamed chunk announces, or null. */
export const pauseFromChunk = (chunk) => {
  if (chunk?.event !== "updates") return null
  const kind = chunk.data?.pause
  if (!PAUSE_KINDS.includes(kind)) return null
  return { kind, node: chunk.data.node ?? null }
}

const toolCallNames = (content) =>
  (Array.isArray(content) ? content : [])
    .filter((block) => block?.type === "remote_tool_call" && block.name)
    .map((block) => block.name)

/** Names of the client tools a message asks the browser to run. */
export const remoteToolNames = (message) => toolCallNames(message?.content)

/**
 * A remote_tool pause is only worth showing when the browser is not already
 * running the tool. `isHandled(name)` says whether a handler is registered;
 * with no known names the pause is kept. Other pauses pass through.
 */
export const unhandledPause = (pause, names, isHandled) => {
  if (!pause || pause.kind !== "remote_tool") return pause
  const missing = names.filter((name) => !isHandled(name))
  if (names.length > 0 && missing.length === 0) return null
  return { ...pause, tool: missing.length > 0 ? missing.join(", ") : null }
}

const pauseKindFromReason = (reason) => {
  if (reason === "remote_tool_call") return "remote_tool"
  if (typeof reason !== "string") return null
  return STATIC_KINDS.find((kind) => reason.startsWith(`interrupt_${kind}`))
}

const stateBody = (res) => {
  const body = res?.data || res || {}
  return body.state || body
}

// Tools named by the thread's last message, which is the one that paused it.
const lastToolNames = (state) => {
  const context = Array.isArray(state?.context) ? state.context : []
  return toolCallNames(context.at(-1)?.content)
}

/**
 * The before / after / remote_tool pause a thread state is held at, or null.
 * `isHandled(name)` is the same check as for streamed pauses.
 */
export const pauseFromState = (res, isHandled = () => false) => {
  const state = stateBody(res)
  const meta = state?.execution_meta
  const kind = pauseKindFromReason(meta?.interrupt_reason)
  if (!kind) return null
  return unhandledPause(
    { kind, node: meta.interrupted_node ?? null },
    lastToolNames(state),
    isHandled
  )
}

/** Any pause a saved thread state holds: interrupt() first, then the rest. */
export const savedPause = (res, isHandled) =>
  interruptFromState(res) || pauseFromState(res, isHandled)

const APPROVE_WORDS = ["approve", "approved", "yes", "true", "allow", "ok"]

const enumApproval = (options) =>
  options.find((o) => APPROVE_WORDS.includes(String(o).toLowerCase()))

// The value "Approve" sends for a schema, or undefined when no fixed approval
// fits (the interrupt wants real input).
const approvalForSchema = (schema) => {
  if (!isObject(schema)) return undefined
  if (schema.type === "boolean") return true
  if (Array.isArray(schema.enum)) return enumApproval(schema.enum)
  if (schema.type !== "object" || !isObject(schema.properties)) {
    return undefined
  }
  const entries = Object.entries(schema.properties)
  if (entries.length === 0) return undefined
  if (!entries.every(([, prop]) => prop?.type === "boolean")) return undefined
  return Object.fromEntries(entries.map(([name]) => [name, true]))
}

/**
 * How the card answers an interrupt. `{ kind: "approve", value }` means the
 * schema allows a fixed approval, so Approve and Reject buttons are enough.
 * `{ kind: "respond" }` means the interrupt wants input (or has no schema), so
 * a Respond field is shown beside Reject.
 */
export const answerPlan = (interrupt) => {
  const value = approvalForSchema(interrupt?.response_schema)
  return value === undefined ? { kind: "respond" } : { kind: "approve", value }
}

/** Text typed into the Respond field: JSON when it parses, else the raw text. */
export const parseResponse = (text) => {
  const trimmed = (text ?? "").trim()
  if (trimmed === "") return undefined
  try {
    return JSON.parse(trimmed)
  } catch {
    return trimmed
  }
}

/** A readable one-liner for an interrupt's value (the thing awaiting approval). */
export const previewValue = (value) => {
  if (value === undefined || value === null) return ""
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
