import { Clock, Eye, EyeOff } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { AUTH_MODES, CAPABILITIES, PROBE_META, SAVED_CONNECTIONS } from "./data"
import styles from "./connect.module.css"

export default function ConnectionPage() {
  const navigate = useNavigate()

  const [theme, setTheme] = useState("dark")
  const [url, setUrl] = useState("http://localhost:8000")
  const [auth, setAuth] = useState("bearer")
  const [showToken, setShowToken] = useState(false)
  const [token, setToken] = useState("")
  const [remember, setRemember] = useState(true)
  const [activeId, setActiveId] = useState("local")

  // dummy connection lifecycle: idle → probing → probed
  const [phase, setPhase] = useState("idle")

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light"
    setTheme(next)
    document.documentElement.setAttribute("data-theme", next)
  }

  function pick(profile) {
    setActiveId(profile.id)
    setUrl(profile.url)
    setAuth(profile.auth)
    setPhase("idle")
  }

  function connect() {
    if (phase === "probing") return
    setPhase("probing")
    const t = setTimeout(() => setPhase("probed"), 1000)
    return () => clearTimeout(t)
  }

  // Enter-to-connect, mirroring the mockup's global keydown handler.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") connect()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

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
          <button className={styles.ghost} onClick={toggleTheme} type="button">
            {theme === "light" ? "Dark" : "Light"}
          </button>
          <button className={styles.ghost} type="button">
            Docs
          </button>
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
                onChange={(e) => setUrl(e.target.value)}
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="auth">Authentication</label>
              <select
                className={styles.select}
                id="auth"
                value={auth}
                onChange={(e) => setAuth(e.target.value)}
              >
                {AUTH_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {auth === "bearer" && (
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

            {auth === "basic" && (
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>Username</label>
                  <input className={styles.input} placeholder="admin" spellCheck={false} />
                </div>
                <div className={styles.field}>
                  <label>Password</label>
                  <input className={styles.input} type="password" placeholder="••••••••" />
                </div>
              </div>
            )}

            {auth === "header" && (
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>Header name</label>
                  <input
                    className={styles.input}
                    defaultValue="X-API-Key"
                    spellCheck={false}
                  />
                </div>
                <div className={styles.field}>
                  <label>Header value</label>
                  <input className={styles.input} type="password" placeholder="sk-..." />
                </div>
              </div>
            )}

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
              onClick={connect}
              disabled={phase === "probing"}
              type="button"
            >
              {phase === "probing" ? (
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
            <div className={styles.sideH}>
              Saved connections <button className={styles.add} type="button">+ Add</button>
            </div>
            <div className={styles.profiles}>
              {SAVED_CONNECTIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.profile} ${activeId === p.id ? styles.active : ""}`}
                  onClick={() => pick(p)}
                >
                  <span className={`${styles.dot} ${p.live ? styles.live : styles.idle}`} />
                  <div className={styles.pBody}>
                    <div className={styles.pName}>{p.name}</div>
                    <div className={styles.pUrl}>{p.url}</div>
                  </div>
                  <span className={styles.pBadge}>{p.badge}</span>
                </button>
              ))}
            </div>

            {phase === "probed" ? (
              <div className={`${styles.probe} ${styles.show}`}>
                <div className={styles.sideH}>Detected capabilities</div>
                <div className={styles.caps}>
                  {CAPABILITIES.map((c) => (
                    <div
                      key={c.label}
                      className={`${styles.cap} ${c.on ? styles.on : styles.off}`}
                    >
                      <span className={styles.ci}>{c.on ? "✓" : "–"}</span> {c.label}
                    </div>
                  ))}
                </div>
                <div className={styles.meta}>
                  {PROBE_META.map((m) => (
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
            ) : (
              <div className={styles.empty}>
                <Clock size={30} strokeWidth={1.5} />
                <p>
                  Connect to probe the backend and detect what this deployment supports.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        Press <span className={styles.kbd}>↵</span> to connect · v0.8 mockup ·{" "}
        <a href="#">agentflow docs</a>
      </div>
    </div>
  )
}
