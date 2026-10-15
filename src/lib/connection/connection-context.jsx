import { TenxGraphClient } from "10xgraph-client"
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
import { useDispatch } from "react-redux"

import { resetDemoClient } from "@/lib/demo/demo-client"
import {
  activeScenario,
  enterDemo,
  exitDemo,
  isDemoActive,
} from "@/lib/demo/demo-mode"
import { loadFixture } from "@/lib/demo/fixtures"
import { getCurrentSettings, saveCurrentSettings } from "@/lib/settings-utils"
import {
  getTenxGraphClient,
  validateAndNormalizeUrl,
} from "@/lib/tenxgraph-client"
import { demoSwitched } from "@/store/app-actions"
import { abortActiveRun } from "@/store/chat-thunks"

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

// Map the form's auth mode onto the SDK's TenxGraphAuth union (bearer/basic).
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
  return { client: new TenxGraphClient(config), baseUrl }
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

// Ping + graph against a real backend. Returns null when the tab entered the demo
// while the probe was in flight (a saved backend re-probing on load, then /demo):
// the demo owns the connection from then on, so the result is dropped unsaved.
const probeBackend = async (client) => {
  const started = performance.now()
  try {
    await client.ping()
    if (isDemoActive()) return null
    const graph = await client.graph()
    if (isDemoActive()) return null
    return { graph, latencyMs: Math.round(performance.now() - started) }
  } catch (e) {
    if (isDemoActive()) return null
    throw e
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
  const dispatch = useDispatch()

  // On load: if a backend was saved, show it immediately AND silently re-verify
  // it in the background. The connection status lives only in React memory, so a
  // reload/HMR restart would otherwise drop it to "idle" (disabling Send) even
  // though the server is still up. We re-probe instead of forcing the user back
  // to the connect page. A failed re-probe just leaves status idle — no error.
  useEffect(() => {
    // A tab in demo mode reconnects to the recorded demo, never the saved backend.
    const scenario = activeScenario()
    if (scenario) {
      connectDemo(scenario)
      return
    }
    const s = getCurrentSettings()
    if (!s.backendUrl) return
    const conn = connFromSettings(s)
    setActive(conn)
    // remember:false — we're rehydrating an already-saved connection, not adding one.
    connect(conn, { remember: false, silent: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Demo mode: the same probe against the recorded fixture. Nothing is persisted, so
  // the visitor's saved connections and settings stay exactly as they were.
  const connectDemo = useCallback(async (scenario) => {
    setStatus("connecting")
    setError(null)
    try {
      const fixture = await loadFixture(scenario)
      const client = getTenxGraphClient()
      const started = performance.now()
      await client.ping()
      const graph = await client.graph()
      const latencyMs = Math.round(performance.now() - started)
      const { graphInfo, nodes, edges } = probeCounts(graph)

      clientReference.current = client
      setActive({
        id: "demo",
        name: fixture.title,
        backendUrl: "recorded demo",
        authMode: "none",
      })
      setInfo(graphInfo)
      setCapabilities(deriveCapabilities(graphInfo))
      setProbe({ latencyMs, nodes, edges })
      setStatus("connected")
      return { ok: true, info: graphInfo }
    } catch (e) {
      clientReference.current = null
      setStatus("error")
      setError(e?.message || "Could not load the demo")
      return { ok: false, error: e }
    }
  }, [])

  // Every way out of the demo: abandon its run, clear the flag, reset every
  // slice so the visitor's own threads and tools come back, and show their saved
  // connection again.
  const leaveDemo = useCallback(() => {
    abortActiveRun()
    exitDemo()
    resetDemoClient()
    dispatch(demoSwitched())
    const s = getCurrentSettings()
    setActive(s.backendUrl ? connFromSettings(s) : null)
  }, [dispatch])

  // The /demo link: same reset in the other direction, then load the recording.
  const startDemo = useCallback(
    (scenario) => {
      abortActiveRun()
      const id = enterDemo(scenario)
      resetDemoClient()
      dispatch(demoSwitched())
      return connectDemo(id)
    },
    [connectDemo, dispatch]
  )

  // `silent` (used by the on-load re-verify): on failure fall back to idle instead
  // of a red error state, since the user didn't just click Connect.
  const connectBackend = useCallback(
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

      try {
        const probed = await probeBackend(client)
        if (!probed) return { ok: false }
        const { graph, latencyMs } = probed
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

  const connect = useCallback(
    (conn, options) => {
      // Settings' re-verify inside the demo re-probes the recording.
      if (conn?.id === "demo") {
        return isDemoActive()
          ? connectDemo(activeScenario())
          : Promise.resolve({ ok: false })
      }
      // Connecting to a real server is a deliberate way out of the demo.
      if (isDemoActive()) {
        leaveDemo()
        setActive(conn)
      }
      return connectBackend(conn, options)
    },
    [connectBackend, connectDemo, leaveDemo]
  )

  const disconnect = useCallback(() => {
    if (isDemoActive()) leaveDemo()
    clientReference.current = null
    setStatus("idle")
    setError(null)
    setCapabilities(null)
    setInfo(null)
    setProbe(null)
  }, [leaveDemo])

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
      connectDemo,
      startDemo,
      disconnect,
      removeSaved,
      getClient,
      isConnected: status === "connected",
      isDemo: active?.id === "demo",
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
      connectDemo,
      startDemo,
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
