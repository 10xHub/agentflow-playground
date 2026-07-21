import { AgentFlowClient } from "@10xscale/agentflow-client"
import PropTypes from "prop-types"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { validateAndNormalizeUrl } from "@/lib/agentflow-client"
import { getCurrentSettings, saveCurrentSettings } from "@/lib/settings-utils"

import { deriveCapabilities } from "./capabilities"
import {
  listConnections,
  removeConnection,
  upsertConnection,
} from "./connections-store"

const ConnectionContext = createContext(null)

/**
 *
 */
export const useConnection = () => {
  const context = useContext(ConnectionContext)
  if (!context) {
    throw new Error("useConnection must be used within <ConnectionProvider>")
  }
  return context
}

// status: "idle" | "connecting" | "connected" | "error"

// Map the form's auth mode onto the SDK's AgentFlowAuth union (bearer/basic).
// bearer stays on the simpler authToken field; basic uses the structured `auth`.
/**
 *
 */
const buildAuth = (conn) => {
  if (conn.authMode === "basic") {
    const username = (conn.authUsername || "").trim()
    const password = conn.authPassword || ""
    return username || password ? { type: "basic", username, password } : null
  }
  return null
}

// A single header row -> [name, value], or null when either side is blank.
const headerEntry = (row) => {
  const name = (row?.name || "").trim()
  const value = (row?.value || "").trim()
  return name && value ? [name, value] : null
}

// "header" mode: any number of {name, value} rows, sent as plain request headers.
// Non-empty, trimmed name required; later rows win on duplicate names.
/**
 *
 */
const buildHeaders = (conn) => {
  if (conn.authMode !== "header" || !Array.isArray(conn.authHeaders)) {
    return null
  }
  const out = {}
  for (const row of conn.authHeaders) {
    const entry = headerEntry(row)
    if (entry) {
      const [name, value] = entry
      out[name] = value
    }
  }
  return Object.keys(out).length ? out : null
}

/**
 *
 */
const buildClient = (conn) => {
  const baseUrl = validateAndNormalizeUrl(conn.backendUrl)
  const config = { baseUrl, timeout: 600000, debug: false }
  if (conn.authMode === "bearer" && conn.authToken) {
    config.authToken = conn.authToken.trim()
  } else {
    const auth = buildAuth(conn)
    if (auth) config.auth = auth
    const headers = buildHeaders(conn)
    if (headers) config.headers = headers
  }
  return { client: new AgentFlowClient(config), baseUrl }
}

const isRejected = (error, message) =>
  error?.status === 401 || error?.status === 403 || /unauthor/i.test(message)

const isTimedOut = (error, message) =>
  error?.name === "AbortError" || /timeout|timed out/i.test(message)

const isUnreachable = (error, message) =>
  error instanceof TypeError ||
  /failed to fetch|networkerror|load failed/i.test(message)

// Turn SDK / fetch failures into a short, honest message for the probe pane.
/**
 *
 */
const humanizeError = (error, baseUrl) => {
  const message = error?.message || String(error)
  if (isRejected(error, message)) {
    return "Rejected (401/403) — this backend needs a valid token."
  }
  if (isTimedOut(error, message)) return `Timed out reaching ${baseUrl}.`
  if (isUnreachable(error, message)) {
    return `Could not reach ${baseUrl} — is the server running? (network or CORS)`
  }
  return message
}

const settingsToken = (s) =>
  s.authMode === "bearer" ? s.authToken || s.auth?.token || "" : ""

const basicField = (s, key) => (s.auth?.type === "basic" ? s.auth[key] : "")

// Rebuild the full connection object from persisted settings so a reload can
// re-verify without the user re-entering anything.
const connFromSettings = (s) => ({
  id: "active",
  name: s.name || "Backend",
  backendUrl: s.backendUrl,
  authMode: s.authMode || "none",
  authToken: settingsToken(s),
  authUsername: basicField(s, "username"),
  authPassword: basicField(s, "password"),
  authHeaders: s.authMode === "header" ? s.headers || [] : [],
})

// The active connection, shaped for persistence (SDK reuse across the app).
const settingsFrom = (conn, baseUrl) => ({
  name: conn.name,
  backendUrl: baseUrl,
  authMode: conn.authMode,
  authToken: conn.authMode === "bearer" ? conn.authToken : "",
  auth: buildAuth(conn),
  headers: conn.authMode === "header" ? conn.authHeaders : [],
})

// `silent` (the on-load re-verify) falls back to idle rather than a red error
// state, since the user didn't just click Connect.
const failStatus = (silent) => (silent ? "idle" : "error")

const countOf = (info, key, list) => info?.[key] ?? list?.length ?? null

// Node/edge counts come from the graph info block, falling back to the lists.
const probeCounts = (graph) => {
  const graphInfo = graph?.data?.info || null
  return {
    graphInfo,
    nodes: countOf(graphInfo, "node_count", graph?.data?.nodes),
    edges: countOf(graphInfo, "edge_count", graph?.data?.edges),
  }
}

/**
 *
 */
export const ConnectionProvider = ({ children }) => {
  const [status, setStatus] = useState("idle")
  const [error, setError] = useState(null)
  const [active, setActive] = useState(null) // {id,name,backendUrl,authMode,authToken}
  const [capabilities, setCapabilities] = useState(null)
  const [info, setInfo] = useState(null)
  const [probe, setProbe] = useState(null) // {latencyMs, nodes, edges}
  const [saved, setSaved] = useState(() => listConnections())
  const clientReference = useRef(null)

  // On load: if a backend was saved, show it immediately AND silently re-verify
  // it in the background. The connection status lives only in React memory, so a
  // reload/HMR restart would otherwise drop it to "idle" (disabling Send) even
  // though the server is still up. We re-probe instead of forcing the user back
  // to the connect page. A failed re-probe just leaves status idle — no error.
  useEffect(() => {
    const s = getCurrentSettings()
    if (!s.backendUrl) return
    const conn = connFromSettings(s)
    setActive(conn)
    // remember:false — we're rehydrating an already-saved connection, not adding one.
    connect(conn, { remember: false, silent: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // `silent` (used by the on-load re-verify): on failure fall back to idle instead
  // of a red error state, since the user didn't just click Connect.
  const connect = useCallback(
    async (conn, { remember = true, silent = false } = {}) => {
      setStatus("connecting")
      setError(null)
      let baseUrl
      let client
      try {
        ;({ client, baseUrl } = buildClient(conn))
      } catch (e) {
        setStatus(failStatus(silent))
        if (!silent) setError(e.message)
        return { ok: false, error: e }
      }

      const started = performance.now()
      try {
        await client.ping()
        const graph = await client.graph()
        const latencyMs = Math.round(performance.now() - started)
        const { graphInfo, nodes, edges } = probeCounts(graph)

        clientReference.current = client
        const normalized = { ...conn, backendUrl: baseUrl }
        setActive(normalized)
        setInfo(graphInfo)
        setCapabilities(deriveCapabilities(graphInfo))
        setProbe({ latencyMs, nodes, edges })
        setStatus("connected")

        // Persist the active connection for SDK reuse across the app.
        saveCurrentSettings(settingsFrom(normalized, baseUrl))
        if (remember) setSaved(upsertConnection(normalized))

        return { ok: true, info: graphInfo }
      } catch (e) {
        clientReference.current = null
        setStatus(failStatus(silent))
        setError(silent ? null : humanizeError(e, baseUrl))
        setCapabilities(null)
        setInfo(null)
        setProbe(null)
        return { ok: false, error: e }
      }
    },
    []
  )

  const disconnect = useCallback(() => {
    clientReference.current = null
    setStatus("idle")
    setError(null)
    setCapabilities(null)
    setInfo(null)
    setProbe(null)
  }, [])

  const removeSaved = useCallback((id) => setSaved(removeConnection(id)), [])

  const getClient = useCallback(() => clientReference.current, [])

  const value = useMemo(
    () => ({
      status,
      error,
      active,
      capabilities,
      info,
      probe,
      saved,
      connect,
      disconnect,
      removeSaved,
      getClient,
      isConnected: status === "connected",
    }),
    [
      status,
      error,
      active,
      capabilities,
      info,
      probe,
      saved,
      connect,
      disconnect,
      removeSaved,
      getClient,
    ]
  )

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  )
}

ConnectionProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
