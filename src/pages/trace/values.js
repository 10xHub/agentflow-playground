// Helpers for the span detail panel: what a payload value looks like and which
// metadata rows exist. Nothing here invents values.

const ROLES = new Set(["user", "assistant", "tool", "system"])

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v)

/** A MessageSummary: an object with a known role. */
export const isMessage = (v) => isObject(v) && ROLES.has(v.role)

const fromText = (role, text) =>
  typeof text === "string" && text ? [{ role, text }] : null

/**
 * Chat bubbles for a span payload when it looks like messages, else null.
 * Understands root inputs/outputs, node inputs/outputs and llm outputs.
 */
export const bubblesFor = (value) => {
  if (!isObject(value)) return null
  if (typeof value.user_message === "string") {
    return fromText("user", value.user_message)
  }
  if (typeof value.assistant_message === "string") {
    return fromText("assistant", value.assistant_message)
  }
  if (isMessage(value.incoming_message)) return [value.incoming_message]
  if (Array.isArray(value.messages) && value.messages.length) {
    return value.messages.every(isMessage) ? value.messages : null
  }
  if (typeof value.text === "string" && value.text) {
    return [
      { role: "assistant", text: value.text, tool_calls: value.tool_calls },
    ]
  }
  return null
}

const num = (n) => (n == null ? null : new Intl.NumberFormat("en-US").format(n))

const ROWS = [
  ["status", (s) => s.status],
  ["kind", (s) => s.kind],
  ["span id", (s) => s.id],
  ["parent", (s) => s.parent],
  [
    "start",
    (s) => (s.start_ms == null ? null : `+${Math.round(s.start_ms)}ms`),
  ],
  [
    "duration",
    (s) => (s.duration_ms == null ? null : `${Math.round(s.duration_ms)}ms`),
  ],
  ["step", (s) => s.step],
  ["visit", (s) => s.visit],
  ["model", (s) => s.model],
  ["input tokens", (s) => num(s.input_tokens)],
  ["output tokens", (s) => num(s.output_tokens)],
  ["reasoning tokens", (s) => num(s.reasoning_tokens)],
  ["total tokens", (s) => num(s.total_tokens)],
  ["tool", (s) => s.tool_name],
  ["tool_call_id", (s) => s.tool_call_id],
]

/** Metadata rows for a span; fields the payload does not carry are skipped. */
export const metaRows = (span) =>
  ROWS.map(([key, get]) => ({ key, value: get(span) })).filter(
    (r) => r.value != null && r.value !== ""
  )

/** True when a payload side holds data worth rendering. */
export const hasValue = (v) => v !== null && v !== undefined
