import { ChevronDown, Moon, Settings, Sun } from "lucide-react"

import { useTheme } from "@/lib/use-theme"

import styles from "./ConnectionBar.module.css"

const CAPABILITIES = [
  { name: "stream", on: true },
  { name: "ws", on: true },
  { name: "live", on: true },
  { name: "store", on: true },
  { name: "checkpointer", on: true },
  { name: "mcp", on: false },
]

/**
 * Global connection bar: brand + active connection pill + capability chips +
 * connection-level actions. `right` lets a page inject an extra armed toggle
 * (e.g. the Chat inspector button) to the left of the theme/settings buttons.
 */
export default function ConnectionBar({
  connection = { name: "Local dev", url: "localhost:8000", live: true },
  capabilities = CAPABILITIES,
  right = null,
}) {
  const { theme, toggle } = useTheme()

  return (
    <div className={styles.connbar}>
      <div className={styles.brand}>
        <span className={styles.mark} />
        <span className={styles.wordmark}>
          agentflow<span className={styles.dim}>/playground</span>
        </span>
      </div>
      <div className={styles.sep} />

      <button className={styles.connPill} type="button">
        <span className={`${styles.dot} ${connection.live ? styles.live : ""}`} />
        <span className={styles.connName}>{connection.name}</span>
        <span className={styles.connUrl}>{connection.url}</span>
        <ChevronDown size={12} className={styles.chev} />
      </button>

      <div className={styles.caps}>
        {capabilities.map((c) => (
          <span key={c.name} className={`${styles.capchip} ${c.on ? "" : styles.off}`}>
            <span className={styles.cd} />
            {c.name}
          </span>
        ))}
      </div>

      <div className={styles.grow} />

      <div className={styles.actions}>
        {right}
        <button className={styles.iconbtn} type="button" onClick={toggle} title="Toggle theme">
          {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
        </button>
        <button className={styles.iconbtn} type="button" title="Settings">
          <Settings size={15} />
        </button>
      </div>
    </div>
  )
}

/** A connection-bar action button styled to match the theme/settings buttons.
 *  Pages inject this into ConnectionBar's `right` slot (e.g. the inspector toggle). */
export function BarButton({ armed = false, children, ...props }) {
  return (
    <button
      className={`${styles.iconbtn} ${armed ? styles.armed : ""}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}
