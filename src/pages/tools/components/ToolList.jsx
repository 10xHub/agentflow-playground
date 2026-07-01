import { Plus } from "lucide-react"

import { GROUPS, TOOLS } from "../data"
import styles from "../tools.module.css"

const DOT_VAR = { client: "var(--accent)", server: "var(--blue)", mcp: "var(--violet)" }

export default function ToolList({ selected, isNew, onSelect, onNew }) {
  return (
    <section className={styles.list}>
      <div className={styles.listHead}>
        <h2>Tools &amp; MCP</h2>
        <button className={styles.newbtn} type="button" onClick={onNew}>
          <Plus size={13} strokeWidth={2} />
          New client tool
        </button>
      </div>
      <div className={styles.listScroll}>
        {GROUPS.map((g) => (
          <div key={g.id}>
            <div className={styles.grpH}>
              <span className={`${styles.gd} ${styles[g.dot]}`} />
              {g.label}
              <span className={styles.gc}>{g.count}</span>
            </div>
            {g.tools.map((key) => {
              const t = TOOLS[key]
              const active = !isNew && selected === key
              return (
                <div
                  key={key}
                  className={`${styles.trow} ${active ? styles.active : ""}`}
                  onClick={() => onSelect(key)}
                >
                  <span className={styles.tdot} style={{ background: DOT_VAR[t.kind] }} />
                  <span className={styles.tn}>{t.name}</span>
                  {t.kind === "client" ? (
                    <span className={styles.rdot} title="registered" />
                  ) : (
                    <span className={styles.tp}>{t.params.length}</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
