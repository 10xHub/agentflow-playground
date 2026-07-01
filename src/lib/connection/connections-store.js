// Saved-connections list persisted to localStorage. The single *active* connection
// is stored separately via settings-utils (pyagenity-settings) for SDK reuse.

const KEY = "agentflow.connections"

// Seed shown on first run. Only `local` is a real reachable default (agentflow api/play).
export const DEFAULT_CONNECTIONS = [
  { id: "local", name: "Local dev", backendUrl: "http://localhost:8000", authMode: "none", authToken: "" },
]

export function listConnections() {
  if (typeof window === "undefined") return DEFAULT_CONNECTIONS
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch {
    /* fall through to defaults */
  }
  return DEFAULT_CONNECTIONS
}

export function saveConnections(list) {
  if (typeof window === "undefined") return
  localStorage.setItem(KEY, JSON.stringify(list))
}

/** Insert or update by id (matched on id, else on backendUrl). Returns the new list. */
export function upsertConnection(conn) {
  const list = listConnections()
  const idx = list.findIndex((c) => c.id === conn.id || c.backendUrl === conn.backendUrl)
  const next = idx >= 0 ? list.map((c, i) => (i === idx ? { ...c, ...conn } : c)) : [...list, conn]
  saveConnections(next)
  return next
}

export function removeConnection(id) {
  const next = listConnections().filter((c) => c.id !== id)
  saveConnections(next)
  return next
}

export function newConnectionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `c_${crypto.randomUUID().slice(0, 8)}`
  return `c_${Math.abs(Date.now()).toString(36)}`
}
