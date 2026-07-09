import { Monitor, Moon, Sun } from "lucide-react"

import { useTheme } from "@/lib/use-theme"

import styles from "../settings.module.css"

const OPTIONS = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: Monitor },
]

export default function AppearanceSection() {
  const { mode, setMode } = useTheme()

  return (
    <section className={styles.card}>
      <div className={styles.cardH}>
        <h2>Appearance</h2>
      </div>

      <div className={styles.settingRow}>
        <div className={styles.stLabel}>
          <div className={styles.stTitle}>Theme</div>
          <div className={styles.stDesc}>
            Applies across the playground. Saved in this browser.
          </div>
        </div>
        <div className={styles.seg}>
          {OPTIONS.map((o) => {
            const Icon = o.icon
            return (
              <button
                key={o.key}
                type="button"
                className={`${styles.segBtn} ${mode === o.key ? styles.segOn : ""}`}
                onClick={() => setMode(o.key)}
                aria-pressed={mode === o.key}
              >
                <Icon size={14} /> {o.label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
