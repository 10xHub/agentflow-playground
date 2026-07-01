// Dummy connection presets + probe result mirroring docs/mockups/entry.html.
// UI-only pass — no real network probe. Swapped for live data later.

export const AUTH_MODES = [
  { value: "none", label: "None (open backend)" },
  { value: "bearer", label: "Bearer token / JWT" },
  { value: "basic", label: "Basic (user + password)" },
  { value: "header", label: "Custom header" },
]

export const SAVED_CONNECTIONS = [
  {
    id: "local",
    name: "Local dev",
    url: "http://localhost:8000",
    auth: "bearer",
    badge: "bearer",
    live: true,
  },
  {
    id: "staging",
    name: "Staging",
    url: "https://staging.api.example.com",
    auth: "bearer",
    badge: "bearer",
    live: false,
  },
  {
    id: "prod",
    name: "Production",
    url: "https://api.example.com",
    auth: "header",
    badge: "header",
    live: false,
  },
]

// Capability rows from the probe pane. on = accent check, off = muted dash.
export const CAPABILITIES = [
  { label: "stream · sse", on: true },
  { label: "websocket", on: true },
  { label: "live · audio", on: true },
  { label: "memory store", on: true },
  { label: "checkpointer", on: true },
  { label: "mcp servers", on: false },
]

export const PROBE_META = [
  { key: "agent", value: "graph.react:app" },
  { key: "token", value: "role=admin · exp 42m" },
  { key: "ping", value: "pong · 38ms", ok: true },
]
