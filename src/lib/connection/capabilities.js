// Derives the capability chips shown in the connection bar + probe pane from the
// backend's GET /v1/graph `info` block. Kept honest: only flags we can actually
// read are asserted; the rest are shown muted rather than implied.

export const CAP_ORDER = ["stream", "ws", "live", "store", "checkpointer", "mcp"]

/**
 * @param {object|undefined} info - `data.info` from client.graph()
 * @returns {Array<{name:string,on:boolean,detail:string}>}
 */
export function deriveCapabilities(info) {
  const i = info || {}
  return [
    { name: "stream", on: true, detail: "POST /v1/graph/stream (SSE)" },
    { name: "ws", on: true, detail: "WS /v1/graph/ws" },
    {
      name: "live",
      on: Boolean(i.is_realtime),
      detail: i.is_realtime
        ? "realtime audio · agent is live-capable (WS /v1/graph/live)"
        : "realtime audio · this agent is not a live agent",
    },
    {
      name: "store",
      on: Boolean(i.store),
      detail: i.store ? "vector / memory store attached" : "no store configured",
    },
    {
      name: "checkpointer",
      on: Boolean(i.checkpointer),
      detail: i.checkpointer
        ? `checkpointer${i.checkpointer_type ? ` · ${i.checkpointer_type}` : ""}`
        : "no checkpointer",
    },
    { name: "mcp", on: false, detail: "not reported by /v1/graph" },
  ]
}
