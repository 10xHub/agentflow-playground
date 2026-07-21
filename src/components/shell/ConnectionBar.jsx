import { ChevronDown, Moon, Settings, Sun } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { useConnection } from "@/lib/connection/ConnectionContext"
import { useTheme } from "@/lib/use-theme"

import styles from "./ConnectionBar.module.css"

// Shown until a real probe fills in capabilities (keeps still-dummy pages populated).
const DEFAULT_CAPS = [
  { name: "stream", on: true },
  { name: "ws", on: true },
  { name: "live", on: true },
  { name: "store", on: true },
  { name: "checkpointer", on: true },
  { name: "mcp", on: false },
]

/**
 *
 */
const hostLabel = (url) => {
  try {
    return new URL(url).host
  } catch {
    return url || "—"
  }
};

/**
 * Global connection bar: brand + active connection pill + capability chips +
 * connection-level actions. `right` lets a page inject an extra armed toggle
 * (e.g. the Chat inspector button) to the left of the theme/settings buttons.
 */
export default function ConnectionBar({ right = null }) {
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const { active, capabilities, isConnected } = useConnection()

  const connection = active
    ? {
        name: active.name,
        url: hostLabel(active.backendUrl),
        live: isConnected,
      }
    : { name: "Not connected", url: "—", live: false }
  const caps = capabilities || DEFAULT_CAPS

  return (
    <div className={styles.connbar}>
      <div className={styles.brand}>
        <span className={styles.mark} />
        <span className={styles.wordmark}>
          agentflow<span className={styles.dim}>/playground</span>
        </span>
      </div>
      <div className={styles.sep} />

      <button
        className={styles.connPill}
        type="button"
        onClick={() => navigate("/")}
      >
        <span
          className={`${styles.dot} ${connection.live ? styles.live : ""}`}
        />
        <span className={styles.connName}>{connection.name}</span>
        <span className={styles.connUrl}>{connection.url}</span>
        <ChevronDown size={12} className={styles.chev} />
      </button>

      <div className={styles.caps}>
        {caps.map((c) => (
          <span
            key={c.name}
            className={`${styles.capchip} ${c.on ? "" : styles.off}`}
          >
            <span className={styles.cd} />
            {c.name}
          </span>
        ))}
      </div>

      <div className={styles.grow} />

      <div className={styles.actions}>
        {right}
        <button
          className={styles.iconbtn}
          type="button"
          onClick={toggle}
          title="Toggle theme"
        >
          {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
        </button>
        <button
          className={styles.iconbtn}
          type="button"
          title="Settings"
          onClick={() => navigate("/settings")}
        >
          <Settings size={15} />
        </button>
      </div>
    </div>
  )
}

/**
 * A connection-bar action button styled to match the theme/settings buttons.
 *  Pages inject this into ConnectionBar's `right` slot (e.g. the inspector toggle).
 */
export const BarButton = ({ armed = false, children, ...properties }) => <button
      className={`${styles.iconbtn} ${armed ? styles.armed : ""}`}
      type="button"
      {...properties}
  >
    {children}
  </button>
)
