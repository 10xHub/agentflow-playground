// Derives the capability chips shown in the connection bar + probe pane from the
// backend's GET /v1/graph `info` block. Kept honest: only flags we can actually
// read are asserted; the rest are shown muted rather than implied.

export const CAP_ORDER = [
  "stream",
  "ws",
  "live",
  "store",
  "checkpointer",
  "mcp",
]

/**
 * @param {object|undefined} info - `data.info` from client.graph()
 * @returns {Array<{name:string,on:boolean,detail:string}>}
 */
export const deriveCapabilities = (info) => {
  const index = info || {}
  return [
    { name: "stream", on: true, detail: "POST /v1/graph/stream (SSE)" },
    { name: "ws", on: true, detail: "WS /v1/graph/ws" },
    {
      name: "live",
      on: Boolean(index.is_realtime),
      detail: index.is_realtime
        ? "realtime audio · agent is live-capable (WS /v1/graph/live)"
        : "realtime audio · this agent is not a live agent",
    },
    {
      name: "store",
      on: Boolean(index.store),
      detail: index.store
        ? "vector / memory store attached"
        : "no store configured",
    },
    {
      name: "checkpointer",
      on: Boolean(index.checkpointer),
      detail: index.checkpointer
        ? `checkpointer${index.checkpointer_type ? ` · ${index.checkpointer_type}` : ""}`
        : "no checkpointer",
    },
    { name: "mcp", on: false, detail: "not reported by /v1/graph" },
  ]
}
