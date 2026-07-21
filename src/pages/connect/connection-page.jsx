import { AlertTriangle, Clock, Eye, EyeOff, Plus, Trash2 } from "lucide-react"
import PropTypes from "prop-types"
import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { track } from "@/lib/analytics"
import { useConnection } from "@/lib/connection/connection-context"
import { newConnectionId } from "@/lib/connection/connections-store"
import { useTheme } from "@/lib/use-theme"

import styles from "./connect.module.css"

// Every auth mode the installed SDK transmits (AgentFlowAuth union: bearer/basic/header).
// "header" is how you reach a backend guarded by a custom BaseAuth that reads an
// arbitrary header (e.g. X-API-Key) — see the note under the field.
const AUTH_MODES = [
  { value: "none", label: "None (open backend)" },
  { value: "bearer", label: "Bearer token / JWT" },
  { value: "basic", label: "Basic (user + password)" },
  { value: "header", label: "Custom header — for a custom BaseAuth backend" },
]

const AUTH_NOTES = {
  none: "Local dev servers run auth-disabled — leave this on “None”.",
  header:
    "Sends these as custom request headers on every call — use for a backend guarded by a custom BaseAuth (e.g. an X-API-Key check), or to pass extra data your backend reads off the request.",
  basic:
    "Sends an Authorization: Basic header. Your custom BaseAuth backend must decode it server-side.",
  bearer:
    "Sends an Authorization: Bearer header — matches the built-in “jwt” auth or any BaseAuth that reads a bearer token.",
}

// Header rows carry a client-only key so React can track them across edits —
// their {name, value} pair is user-typed and therefore not stable.
let rowSeed = 0
const nextRowKey = () => {
  rowSeed += 1
  return `hdr${rowSeed}`
}
const newRow = () => ({ name: "", value: "", _key: nextRowKey() })

/**
 *
 */
const hostLabel = (url) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

// Only carry a saved field over when the profile's auth mode actually uses it.
const fieldFor = (mode, wanted, value) => (mode === wanted ? value || "" : "")

const pickedHeaders = (mode, savedHeaders) => {
  const rows = mode === "header" ? savedHeaders : null
  return rows?.length
    ? rows.map((h) => ({ ...h, _key: nextRowKey() }))
    : [newRow()]
}

// Shape the form (or the ?backendUrl= override) into a connection object.
const buildConn = (source, profile) => ({
  id:
    source.activeId && source.activeId !== "custom"
      ? source.activeId
      : newConnectionId(),
  name: profile?.name || hostLabel(source.url),
  backendUrl: source.url,
  authMode: source.authMode,
  authToken: source.token,
  authUsername: source.username,
  authPassword: source.password,
  authHeaders: source.headers,
})

/**
 *
 */
const TopBar = ({ theme, onToggle }) => (
  <div className={styles.topbar}>
    <div className={styles.brand}>
      <span className={styles.mark} />
      <span className={styles.wordmark}>
        agentflow<span className={styles.dim}>/playground</span>
      </span>
    </div>
    <div className={styles.topActions}>
      <button className={styles.ghost} onClick={onToggle} type="button">
        {theme === "light" ? "Dark" : "Light"}
      </button>
      <a
        className={styles.ghost}
        href="https://agentflow.10xscale.ai/"
        target="_blank"
        rel="noreferrer"
      >
        Docs
      </a>
    </div>
  </div>
)

TopBar.propTypes = {
  theme: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
}

/**
 *
 */
const RevealButton = ({ size = 16, shown, label, onToggle }) => (
  <button
    className={styles.reveal}
    onClick={onToggle}
    aria-label={shown ? `Hide ${label}` : `Show ${label}`}
    type="button"
  >
    {shown ? <EyeOff size={size} /> : <Eye size={size} />}
  </button>
)

RevealButton.propTypes = {
  size: PropTypes.number,
  shown: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
}

/**
 *
 */
const BearerField = ({ token, showToken, onToken, onToggleReveal }) => (
  <div className={styles.field}>
    <label htmlFor="token">Token</label>
    <div className={styles.inputWrap}>
      <input
        className={`${styles.input} ${styles.tokenInput}`}
        id="token"
        type={showToken ? "text" : "password"}
        value={token}
        onChange={(e) => onToken(e.target.value)}
        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
        spellCheck={false}
      />
      <RevealButton shown={showToken} label="token" onToggle={onToggleReveal} />
    </div>
  </div>
)

BearerField.propTypes = {
  token: PropTypes.string.isRequired,
  showToken: PropTypes.bool.isRequired,
  onToken: PropTypes.func.isRequired,
  onToggleReveal: PropTypes.func.isRequired,
}

/**
 *
 */
const BasicFields = ({
  username,
  password,
  showToken,
  onUsername,
  onPassword,
  onToggleReveal,
}) => (
  <>
    <div className={styles.field}>
      <label htmlFor="basic-user">Username</label>
      <input
        className={styles.input}
        id="basic-user"
        value={username}
        onChange={(e) => onUsername(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
    <div className={styles.field}>
      <label htmlFor="basic-pass">Password</label>
      <div className={styles.inputWrap}>
        <input
          className={`${styles.input} ${styles.tokenInput}`}
          id="basic-pass"
          type={showToken ? "text" : "password"}
          value={password}
          onChange={(e) => onPassword(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <RevealButton
          shown={showToken}
          label="password"
          onToggle={onToggleReveal}
        />
      </div>
    </div>
  </>
)

BasicFields.propTypes = {
  username: PropTypes.string.isRequired,
  password: PropTypes.string.isRequired,
  showToken: PropTypes.bool.isRequired,
  onUsername: PropTypes.func.isRequired,
  onPassword: PropTypes.func.isRequired,
  onToggleReveal: PropTypes.func.isRequired,
}

/**
 *
 */
const HeaderRow = ({ row, index, showToken, canRemove, onPatch, onRemove }) => (
  <div className={styles.headerRow}>
    <input
      className={styles.input}
      id={`header-name-${index}`}
      value={row.name}
      onChange={(e) => onPatch(index, { name: e.target.value })}
      placeholder="Header-Name"
      autoComplete="off"
      spellCheck={false}
      aria-label="Header name"
    />
    <input
      className={styles.input}
      type={showToken ? "text" : "password"}
      value={row.value}
      onChange={(e) => onPatch(index, { value: e.target.value })}
      placeholder="value"
      autoComplete="off"
      spellCheck={false}
      aria-label="Header value"
    />
    <button
      className={styles.reveal}
      onClick={() => onRemove(index)}
      disabled={!canRemove}
      aria-label="Remove header"
      type="button"
    >
      <Trash2 size={16} />
    </button>
  </div>
)

HeaderRow.propTypes = {
  row: PropTypes.shape({
    name: PropTypes.string,
    value: PropTypes.string,
  }).isRequired,
  index: PropTypes.number.isRequired,
  showToken: PropTypes.bool.isRequired,
  canRemove: PropTypes.bool.isRequired,
  onPatch: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
}

/**
 *
 */
const HeaderFields = ({
  headers,
  showToken,
  onToggleReveal,
  onAdd,
  onPatch,
  onRemove,
}) => (
  <div className={styles.field}>
    {/* Sticky action bar so "Add header" stays reachable no matter
        how many rows are added — the rows below scroll, this doesn't. */}
    <div className={styles.headerBar}>
      <label htmlFor="header-name-0">Custom headers</label>
      <div className={styles.headerBarActions}>
        <RevealButton
          size={14}
          shown={showToken}
          label="values"
          onToggle={onToggleReveal}
        />
        <button className={styles.addBtn} onClick={onAdd} type="button">
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
    <div className={styles.headerList}>
      {headers.map((row, index) => (
        <HeaderRow
          key={row._key}
          row={row}
          index={index}
          showToken={showToken}
          canRemove={headers.length !== 1}
          onPatch={onPatch}
          onRemove={onRemove}
        />
      ))}
    </div>
  </div>
)

HeaderFields.propTypes = {
  headers: PropTypes.arrayOf(PropTypes.object).isRequired,
  showToken: PropTypes.bool.isRequired,
  onToggleReveal: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  onPatch: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
}

/**
 *
 */
const SavedProfiles = ({ saved, activeId, status, onPick }) => (
  <div className={styles.profiles}>
    {saved.map((p) => (
      <button
        key={p.id}
        type="button"
        className={`${styles.profile} ${activeId === p.id ? styles.active : ""}`}
        onClick={() => onPick(p)}
      >
        <span
          className={`${styles.dot} ${
            status === "connected" && activeId === p.id
              ? styles.live
              : styles.idle
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
)

SavedProfiles.propTypes = {
  saved: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeId: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  onPick: PropTypes.func.isRequired,
}

// Probe read-out rows, only meaningful once the backend answered.
const buildMetaRows = (probe, info) =>
  [
    probe && { key: "ping", value: `pong · ${probe.latencyMs}ms`, ok: true },
    probe && {
      key: "graph",
      value: `${probe.nodes ?? "?"} nodes · ${probe.edges ?? "?"} edges`,
    },
    info?.state_type && { key: "state", value: info.state_type },
  ].filter(Boolean)

/**
 *
 */
const ProbePanel = ({ capabilities, info = null, probe = null, onEnter }) => (
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
      {buildMetaRows(probe, info).map((m) => (
        <div key={m.key}>
          <b>{m.key}</b>&nbsp;&nbsp;
          {m.ok ? <span className={styles.ok}>{m.value}</span> : m.value}
        </div>
      ))}
    </div>
    <button
      className={`${styles.btnEnter} ${styles.show}`}
      onClick={onEnter}
      type="button"
    >
      Enter playground →
    </button>
  </div>
)

ProbePanel.propTypes = {
  capabilities: PropTypes.arrayOf(PropTypes.object).isRequired,
  info: PropTypes.object,
  probe: PropTypes.object,
  onEnter: PropTypes.func.isRequired,
}

/**
 *
 */
const StatusPanel = ({
  status,
  error = null,
  capabilities = null,
  info = null,
  probe = null,
  url,
  onEnter,
}) => (
  <>
    {status === "connecting" && (
      <div className={styles.connecting}>
        <span className={styles.sp} />
        probing {hostLabel(url)} …
      </div>
    )}

    {status === "connected" && capabilities && (
      <ProbePanel
        capabilities={capabilities}
        info={info}
        probe={probe}
        onEnter={onEnter}
      />
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
        <p>
          Connect to probe the backend and detect what this deployment supports.
        </p>
      </div>
    )}
  </>
)

StatusPanel.propTypes = {
  status: PropTypes.string.isRequired,
  error: PropTypes.string,
  capabilities: PropTypes.arrayOf(PropTypes.object),
  info: PropTypes.object,
  probe: PropTypes.object,
  url: PropTypes.string.isRequired,
  onEnter: PropTypes.func.isRequired,
}

/**
 *
 */
const UrlField = ({ url, onUrl }) => (
  <div className={styles.field}>
    <label htmlFor="url">
      Base URL <span className={styles.req}>*</span>
    </label>
    <input
      className={styles.input}
      id="url"
      value={url}
      onChange={(e) => onUrl(e.target.value)}
      spellCheck={false}
      autoComplete="off"
      placeholder="http://localhost:8000"
    />
  </div>
)

UrlField.propTypes = {
  url: PropTypes.string.isRequired,
  onUrl: PropTypes.func.isRequired,
}

/**
 *
 */
const AuthModeSelect = ({ authMode, onAuthMode }) => (
  <div className={styles.field}>
    <label htmlFor="auth">Authentication</label>
    <select
      className={styles.select}
      id="auth"
      value={authMode}
      onChange={(e) => onAuthMode(e.target.value)}
    >
      {AUTH_MODES.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </select>
  </div>
)

AuthModeSelect.propTypes = {
  authMode: PropTypes.string.isRequired,
  onAuthMode: PropTypes.func.isRequired,
}

/**
 *
 */
const RememberSwitch = ({ remember, onRemember }) => (
  <div className={styles.switchRow}>
    <span>Remember this connection</span>
    <label className={styles.switch} aria-label="Remember this connection">
      <input
        type="checkbox"
        checked={remember}
        onChange={(e) => onRemember(e.target.checked)}
      />
      <span className={styles.slider} />
    </label>
  </div>
)

RememberSwitch.propTypes = {
  remember: PropTypes.bool.isRequired,
  onRemember: PropTypes.func.isRequired,
}

/**
 *
 */
const ConnectButton = ({ status, onConnect }) => (
  <button
    className={styles.btnPrimary}
    onClick={onConnect}
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
)

ConnectButton.propTypes = {
  status: PropTypes.string.isRequired,
  onConnect: PropTypes.func.isRequired,
}

/**
 *
 */
const PageFooter = () => (
  <div className={styles.footer}>
    Press <span className={styles.kbd}>↵</span> to connect ·{" "}
    <a href="https://agentflow.10xscale.ai/" target="_blank" rel="noreferrer">
      agentflow docs
    </a>
  </div>
)

/**
 *
 */
const ConnectionPage = () => {
  const navigate = useNavigate()
  const [parameters, setParameters] = useSearchParams()
  const { theme, toggle } = useTheme()
  const { status, error, capabilities, info, probe, saved, connect } =
    useConnection()

  const [url, setUrl] = useState("http://localhost:8000")
  const [authMode, setAuthMode] = useState("none")
  const [token, setToken] = useState("")
  const [showToken, setShowToken] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  // Custom-header mode: any number of {name, value} rows. Handy for passing extra
  // data a custom BaseAuth (or downstream tooling) reads off the request.
  const [headers, setHeaders] = useState(() => [newRow()])
  const [remember, setRemember] = useState(true)
  const [activeId, setActiveId] = useState("local")
  const autoRan = useRef(false)

  const updateHeader = (index, patch) =>
    setHeaders((rows) =>
      rows.map((r, index_) => (index_ === index ? { ...r, ...patch } : r))
    )
  const addHeader = () => setHeaders((rows) => [...rows, newRow()])
  const removeHeader = (index) =>
    setHeaders((rows) =>
      rows.length > 1 ? rows.filter((_, index_) => index_ !== index) : rows
    )
  const toggleReveal = () => setShowToken((s) => !s)
  // Typing a URL by hand detaches the form from whichever saved profile is lit.
  const onUrl = (next) => {
    setUrl(next)
    setActiveId("custom")
  }

  const runConnect = async ({ auto = false, override } = {}) => {
    const source = override || {
      url,
      authMode,
      token,
      activeId,
      username,
      password,
      headers,
    }
    const profile = saved.find((c) => c.id === source.activeId)
    const res = await connect(buildConn(source, profile), { remember })
    if (res.ok) {
      // The backend URL is deliberately not sent — it can be a private host.
      track("connection_established", {
        auth_mode: source.authMode || "none",
        remembered: Boolean(remember),
      })
    }
    if (res.ok && auto) navigate("/chat")
    return res
  }

  const onConnectClick = () => runConnect()
  const onEnterPlayground = () => navigate("/chat")

  // Auto-connect from ?backendUrl= (+ optional ?token=) — this is exactly what
  // `agentflow play` appends, and makes a connection shareable as a link.
  useEffect(() => {
    if (autoRan.current) return
    const backendUrl =
      parameters.get("backendUrl") || parameters.get("base_url")
    if (!backendUrl) return
    autoRan.current = true
    const urlToken = parameters.get("token") || ""
    const nextAuth = urlToken ? "bearer" : "none"
    setUrl(backendUrl)
    setToken(urlToken)
    setAuthMode(nextAuth)
    setActiveId("custom")
    // Strip params so tokens don't linger in history; then probe + auto-advance.
    setParameters({}, { replace: true })
    runConnect({
      auto: true,
      override: {
        url: backendUrl,
        authMode: nextAuth,
        token: urlToken,
        activeId: "custom",
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   *
   */
  const pick = (profile) => {
    setActiveId(profile.id)
    setUrl(profile.backendUrl)
    const mode = profile.authMode || "none"
    setAuthMode(mode)
    setToken(fieldFor(mode, "bearer", profile.authToken))
    setUsername(fieldFor(mode, "basic", profile.authUsername))
    setPassword(fieldFor(mode, "basic", profile.authPassword))
    setHeaders(pickedHeaders(mode, profile.authHeaders))
  }

  // Enter-to-connect, mirroring the mockup's global keydown handler.
  useEffect(() => {
    /**
     *
     */
    const onKey = (e) => {
      if (
        e.key === "Enter" &&
        e.target.tagName !== "TEXTAREA" &&
        status !== "connecting"
      ) {
        runConnect()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    url,
    authMode,
    token,
    username,
    password,
    headers,
    activeId,
    remember,
    status,
  ])

  return (
    <div className={styles.page}>
      <TopBar theme={theme} onToggle={toggle} />

      <div className={styles.stage}>
        <div className={styles.card}>
          {/* LEFT — form */}
          <div className={styles.form}>
            <div className={styles.eyebrow}>Connect a backend</div>
            <h1 className={styles.title}>Point at a deployment</h1>
            <p className={styles.lede}>
              Connect to any Agentflow API — a local dev server or a live
              deployment. Everything you see is scoped to the token you provide.
            </p>

            <UrlField url={url} onUrl={onUrl} />

            <AuthModeSelect authMode={authMode} onAuthMode={setAuthMode} />

            {authMode === "bearer" && (
              <BearerField
                token={token}
                showToken={showToken}
                onToken={setToken}
                onToggleReveal={toggleReveal}
              />
            )}

            {authMode === "basic" && (
              <BasicFields
                username={username}
                password={password}
                showToken={showToken}
                onUsername={setUsername}
                onPassword={setPassword}
                onToggleReveal={toggleReveal}
              />
            )}

            {authMode === "header" && (
              <HeaderFields
                headers={headers}
                showToken={showToken}
                onToggleReveal={toggleReveal}
                onAdd={addHeader}
                onPatch={updateHeader}
                onRemove={removeHeader}
              />
            )}

            <p className={styles.authNote}>{AUTH_NOTES[authMode]}</p>

            <RememberSwitch remember={remember} onRemember={setRemember} />

            <ConnectButton status={status} onConnect={onConnectClick} />
          </div>

          {/* RIGHT — status */}
          <div className={styles.side}>
            <div className={styles.sideH}>Saved connections</div>
            <SavedProfiles
              saved={saved}
              activeId={activeId}
              status={status}
              onPick={pick}
            />
            <StatusPanel
              status={status}
              error={error}
              capabilities={capabilities}
              info={info}
              probe={probe}
              url={url}
              onEnter={onEnterPlayground}
            />
          </div>
        </div>
      </div>

      <PageFooter />
    </div>
  )
}

export default ConnectionPage
