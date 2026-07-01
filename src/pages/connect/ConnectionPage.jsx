import { AlertTriangle, Clock, Eye, EyeOff } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { useConnection } from "@/lib/connection/ConnectionContext"
import { newConnectionId } from "@/lib/connection/connections-store"
import { useTheme } from "@/lib/use-theme"

import styles from "./connect.module.css"

// Only the auth modes the installed SDK actually transmits. Basic / custom-header
// are deferred (see authNote) rather than shown as controls that silently no-op.
const AUTH_MODES = [
  { value: "none", label: "None (open backend)" },
  { value: "bearer", label: "Bearer token / JWT" },
]

function hostLabel(url) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export default function ConnectionPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { theme, toggle } = useTheme()
  const { status, error, capabilities, info, probe, saved, connect } = useConnection()

  const [url, setUrl] = useState("http://localhost:8000")
  const [authMode, setAuthMode] = useState("none")
  const [token, setToken] = useState("")
  const [showToken, setShowToken] = useState(false)
  const [remember, setRemember] = useState(true)
  const [activeId, setActiveId] = useState("local")
  const autoRan = useRef(false)

  const runConnect = async ({ auto = false, override } = {}) => {
    const src = override || { url, authMode, token, activeId }
    const profile = saved.find((c) => c.id === src.activeId)
    const conn = {
      id: src.activeId && src.activeId !== "custom" ? src.activeId : newConnectionId(),
      name: profile?.name || hostLabel(src.url),
      backendUrl: src.url,
      authMode: src.authMode,
      authToken: src.token,
    }
    const res = await connect(conn, { remember })
    if (res.ok && auto) navigate("/chat")
    return res
  }

  // Auto-connect from ?backendUrl= (+ optional ?token=) — this is exactly what
  // `agentflow play` appends, and makes a connection shareable as a link.
  useEffect(() => {
    if (autoRan.current) return
    const backendUrl = params.get("backendUrl") || params.get("base_url")
    if (!backendUrl) return
    autoRan.current = true
    const urlToken = params.get("token") || ""
    const nextAuth = urlToken ? "bearer" : "none"
    setUrl(backendUrl)
    setToken(urlToken)
    setAuthMode(nextAuth)
    setActiveId("custom")
    // Strip params so tokens don't linger in history; then probe + auto-advance.
    setParams({}, { replace: true })
    runConnect({ auto: true, override: { url: backendUrl, authMode: nextAuth, token: urlToken, activeId: "custom" } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pick(profile) {
    setActiveId(profile.id)
    setUrl(profile.backendUrl)
    setAuthMode(profile.authMode || "none")
    setToken(profile.authMode === "bearer" ? profile.authToken || "" : "")
  }

  // Enter-to-connect, mirroring the mockup's global keydown handler.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && status !== "connecting") {
        runConnect()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, authMode, token, activeId, remember, status])

  const metaRows =
    status === "connected"
      ? [
          probe && { key: "ping", value: `pong · ${probe.latencyMs}ms`, ok: true },
          probe && { key: "graph", value: `${probe.nodes ?? "?"} nodes · ${probe.edges ?? "?"} edges` },
          info?.state_type && { key: "state", value: info.state_type },
        ].filter(Boolean)
      : []

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.mark} />
          <span className={styles.wordmark}>
            agentflow<span className={styles.dim}>/playground</span>
          </span>
        </div>
        <div className={styles.topActions}>
          <button className={styles.ghost} onClick={toggle} type="button">
            {theme === "light" ? "Dark" : "Light"}
          </button>
          <a
            className={styles.ghost}
            href="https://10xhub.github.io/Agentflow/"
            target="_blank"
            rel="noreferrer"
          >
            Docs
          </a>
        </div>
      </div>

      <div className={styles.stage}>
        <div className={styles.card}>
          {/* LEFT — form */}
          <div className={styles.form}>
            <div className={styles.eyebrow}>Connect a backend</div>
            <h1 className={styles.title}>Point at a deployment</h1>
            <p className={styles.lede}>
              Connect to any Agentflow API — a local dev server or a live deployment. Everything
              you see is scoped to the token you provide.
            </p>

            <div className={styles.field}>
              <label htmlFor="url">
                Base URL <span className={styles.req}>*</span>
              </label>
              <input
                className={styles.input}
                id="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setActiveId("custom")
                }}
                spellCheck={false}
                autoComplete="off"
                placeholder="http://localhost:8000"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="auth">Authentication</label>
              <select
                className={styles.select}
                id="auth"
                value={authMode}
                onChange={(e) => setAuthMode(e.target.value)}
              >
                {AUTH_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {authMode === "bearer" && (
              <div className={styles.field}>
                <label htmlFor="token">Token</label>
                <div className={styles.inputWrap}>
                  <input
                    className={`${styles.input} ${styles.tokenInput}`}
                    id="token"
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    spellCheck={false}
                  />
                  <button
                    className={styles.reveal}
                    onClick={() => setShowToken((s) => !s)}
                    aria-label={showToken ? "Hide token" : "Show token"}
                    type="button"
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <p className={styles.authNote}>
              Local dev servers run auth-disabled — leave this on “None”. Basic and custom-header
              auth arrive with the next client SDK.
            </p>

            <div className={styles.switchRow}>
              <span>Remember this connection</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>

            <button
              className={styles.btnPrimary}
              onClick={() => runConnect()}
              disabled={status === "connecting"}
              type="button"
            >
              {status === "connecting" ? (
                <>
                  <span className={styles.spinner} />
                  <span>Probing…</span>
                </>
              ) : (
                "Connect & verify"
              )}
            </button>
          </div>

          {/* RIGHT — status */}
          <div className={styles.side}>
            <div className={styles.sideH}>Saved connections</div>
            <div className={styles.profiles}>
              {saved.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.profile} ${activeId === p.id ? styles.active : ""}`}
                  onClick={() => pick(p)}
                >
                  <span
                    className={`${styles.dot} ${
                      status === "connected" && activeId === p.id ? styles.live : styles.idle
                    }`}
                  />
                  <div className={styles.pBody}>
                    <div className={styles.pName}>{p.name}</div>
                    <div className={styles.pUrl}>{p.backendUrl}</div>
                  </div>
                  <span className={styles.pBadge}>{p.authMode || "none"}</span>
                </button>
              ))}
            </div>

            {status === "connecting" && (
              <div className={styles.connecting}>
                <span className={styles.sp} />
                probing {hostLabel(url)} …
              </div>
            )}

            {status === "connected" && capabilities && (
              <div className={`${styles.probe} ${styles.show}`}>
                <div className={styles.sideH}>Detected capabilities</div>
                <div className={styles.caps}>
                  {capabilities.map((c) => (
                    <div
                      key={c.name}
                      title={c.detail}
                      className={`${styles.cap} ${c.on ? styles.on : styles.off}`}
                    >
                      <span className={styles.ci}>{c.on ? "✓" : "–"}</span> {c.name}
                    </div>
                  ))}
                </div>
                <div className={styles.meta}>
                  {metaRows.map((m) => (
                    <div key={m.key}>
                      <b>{m.key}</b>&nbsp;&nbsp;
                      {m.ok ? <span className={styles.ok}>{m.value}</span> : m.value}
                    </div>
                  ))}
                </div>
                <button
                  className={`${styles.btnEnter} ${styles.show}`}
                  onClick={() => navigate("/chat")}
                  type="button"
                >
                  Enter playground →
                </button>
              </div>
            )}

            {status === "error" && (
              <div className={styles.errBox}>
                <AlertTriangle size={28} strokeWidth={1.6} />
                <div className={styles.errTitle}>Connection failed</div>
                <div className={styles.errMsg}>{error}</div>
              </div>
            )}

            {status === "idle" && (
              <div className={styles.empty}>
                <Clock size={30} strokeWidth={1.5} />
                <p>Connect to probe the backend and detect what this deployment supports.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        Press <span className={styles.kbd}>↵</span> to connect ·{" "}
        <a href="https://10xhub.github.io/Agentflow/" target="_blank" rel="noreferrer">
          agentflow docs
        </a>
      </div>
    </div>
  )
}
