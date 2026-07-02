import { AgentFlowClient } from "@10xscale/agentflow-client"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

import { validateAndNormalizeUrl } from "@/lib/agentflow-client"
import { getCurrentSettings, saveCurrentSettings } from "@/lib/settings-utils"

import { deriveCapabilities } from "./capabilities"
import { listConnections, removeConnection, upsertConnection } from "./connections-store"

const ConnectionContext = createContext(null)

export function useConnection() {
  const ctx = useContext(ConnectionContext)
  if (!ctx) throw new Error("useConnection must be used within <ConnectionProvider>")
  return ctx
}

// status: "idle" | "connecting" | "connected" | "error"

// Map the form's auth mode onto the SDK's AgentFlowAuth union (bearer/basic/header).
// bearer stays on the simpler authToken field; basic/header use the structured `auth`.
function buildAuth(conn) {
  if (conn.authMode === "basic") {
    const username = (conn.authUsername || "").trim()
    const password = conn.authPassword || ""
    return username || password ? { type: "basic", username, password } : null
  }
  if (conn.authMode === "header") {
    const name = (conn.authHeaderName || "").trim()
    const value = (conn.authHeaderValue || "").trim()
    const prefix = (conn.authHeaderPrefix || "").trim()
    return name && value ? { type: "header", name, value, prefix: prefix || null } : null
  }
  return null
}

function buildClient(conn) {
  const baseUrl = validateAndNormalizeUrl(conn.backendUrl)
  const config = { baseUrl, timeout: 600000, debug: false }
  if (conn.authMode === "bearer" && conn.authToken) {
    config.authToken = conn.authToken.trim()
  } else {
    const auth = buildAuth(conn)
    if (auth) config.auth = auth
  }
  return { client: new AgentFlowClient(config), baseUrl }
}

// Turn SDK / fetch failures into a short, honest message for the probe pane.
function humanizeError(err, baseUrl) {
  const msg = err?.message || String(err)
  if (err?.status === 401 || err?.status === 403 || /unauthor/i.test(msg)) {
    return "Rejected (401/403) — this backend needs a valid token."
  }
  if (err?.name === "AbortError" || /timeout|timed out/i.test(msg)) {
    return `Timed out reaching ${baseUrl}.`
  }
  if (err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(msg)) {
    return `Could not reach ${baseUrl} — is the server running? (network or CORS)`
  }
  return msg
}

export function ConnectionProvider({ children }) {
  const [status, setStatus] = useState("idle")
  const [error, setError] = useState(null)
  const [active, setActive] = useState(null) // {id,name,backendUrl,authMode,authToken}
  const [capabilities, setCapabilities] = useState(null)
  const [info, setInfo] = useState(null)
  const [probe, setProbe] = useState(null) // {latencyMs, nodes, edges}
  const [saved, setSaved] = useState(() => listConnections())
  const clientRef = useRef(null)

  // Hydrate the last-used connection (name/url) so the bar can show it before a probe.
  useEffect(() => {
    const s = getCurrentSettings()
    if (s.backendUrl) {
      setActive({
        id: "active",
        name: s.name || "Backend",
        backendUrl: s.backendUrl,
        authMode: s.authMode,
        authToken: s.authToken,
      })
    }
  }, [])

  const connect = useCallback(async (conn, { remember = true } = {}) => {
    setStatus("connecting")
    setError(null)
    let baseUrl
    let client
    try {
      ;({ client, baseUrl } = buildClient(conn))
    } catch (e) {
      setStatus("error")
      setError(e.message)
      return { ok: false, error: e }
    }

    const started = performance.now()
    try {
      await client.ping()
      const graph = await client.graph()
      const latencyMs = Math.round(performance.now() - started)
      const graphInfo = graph?.data?.info || null
      const nodes = graphInfo?.node_count ?? graph?.data?.nodes?.length ?? null
      const edges = graphInfo?.edge_count ?? graph?.data?.edges?.length ?? null

      clientRef.current = client
      const normalized = { ...conn, backendUrl: baseUrl }
      setActive(normalized)
      setInfo(graphInfo)
      setCapabilities(deriveCapabilities(graphInfo))
      setProbe({ latencyMs, nodes, edges })
      setStatus("connected")

      // Persist the active connection for SDK reuse across the app.
      saveCurrentSettings({
        name: normalized.name,
        backendUrl: baseUrl,
        authMode: normalized.authMode,
        authToken: normalized.authMode === "bearer" ? normalized.authToken : "",
        auth: buildAuth(normalized),
      })
      if (remember) setSaved(upsertConnection(normalized))

      return { ok: true, info: graphInfo }
    } catch (e) {
      clientRef.current = null
      setStatus("error")
      setError(humanizeError(e, baseUrl))
      setCapabilities(null)
      setInfo(null)
      setProbe(null)
      return { ok: false, error: e }
    }
  }, [])

  const disconnect = useCallback(() => {
    clientRef.current = null
    setStatus("idle")
    setError(null)
    setCapabilities(null)
    setInfo(null)
    setProbe(null)
  }, [])

  const removeSaved = useCallback((id) => setSaved(removeConnection(id)), [])

  const getClient = useCallback(() => clientRef.current, [])

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
    [status, error, active, capabilities, info, probe, saved, connect, disconnect, removeSaved, getClient]
  )

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>
}
