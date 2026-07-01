import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { useState } from "react"

import { FILTERS, THREADS } from "../data"
import styles from "../threads.module.css"

export default function ThreadList({ selectedId, onSelect }) {
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")

  const rows = THREADS.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return t.id.toLowerCase().includes(q) || t.user.toLowerCase().includes(q)
  })

  return (
    <section className={styles.list}>
      <div className={styles.listHead}>
        <div className={styles.listTitle}>
          <h2>Threads</h2>
          <span className={styles.cnt}>142 readable</span>
        </div>
        <div className={styles.search}>
          <Search size={14} strokeWidth={1.7} />
          <input
            placeholder="Search id, user, content…"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`${styles.fchip} ${filter === f.key ? styles.on : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} <span className={styles.n}>{f.n}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.rows}>
        {rows.map((t) => (
          <div
            key={t.fullId}
            className={`${styles.row} ${selectedId === t.fullId ? styles.active : ""}`}
            onClick={() => onSelect(t.fullId)}
          >
            <div className={styles.rowTop}>
              <span className={styles.rowId}>{t.id}</span>
              <span className={`${styles.st} ${styles[t.status]}`}>
                <span className={styles.sd} />
                {t.status}
              </span>
            </div>
            <div className={styles.rowMeta}>
              <span className={styles.u}>{t.user}</span>
              <span>· {t.msgs} msgs</span>
              <span>· {t.ago}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.pager}>
        <span>1–20 of 142</span>
        <div className={styles.pg}>
          <button type="button" className={styles.pgbtn}>
            <ChevronLeft size={13} strokeWidth={2} />
          </button>
          <button type="button" className={styles.pgbtn}>
            <ChevronRight size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    </section>
  )
}
