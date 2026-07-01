import { Check, Pencil, RotateCcw } from "lucide-react"

import { CATS, COLLECTIONS, SCOPE, TYPES } from "../data"
import styles from "../memory.module.css"

export default function FacetsColumn({
  collection,
  onCollectionChange,
  loaded,
  types,
  onToggleType,
  onAllTypes,
  cat,
  onSetCat,
}) {
  return (
    <aside className={styles.facets}>
      <div className={styles.facetsScroll}>
        <div className={styles.scopeCard}>
          <div className={styles.scopeH}>
            <span className={styles.t}>Store scope</span>
            <button className={styles.reload} type="button">
              <RotateCcw size={11} />
              Reload
            </button>
          </div>

          <div className={styles.skv}>
            <span className={`${styles.k} ${styles.colEditHint}`}>
              <Pencil size={10} />
              collection
            </span>
            <input
              className={styles.colInput}
              list="mem-col-list"
              value={collection}
              spellCheck={false}
              onChange={(e) => onCollectionChange(e.target.value)}
              title="Passed as config.collection — type any collection name"
            />
            <datalist id="mem-col-list">
              {COLLECTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className={styles.skv}>
            <span className={styles.k}>user_id</span>
            <span className={styles.v}>{SCOPE.userId}</span>
          </div>
          <div className={styles.skv}>
            <span className={styles.k}>loaded</span>
            <span className={styles.v}>{loaded}</span>
          </div>

          <div className={styles.scopeNote}>
            <b>Token-scoped.</b> The store API pins <span className="mono">user_id</span> to the
            connected token server-side; there is no cross-user list. Set{" "}
            <span className="mono">collection</span> to inspect a non-default one — it's sent as{" "}
            <span className="mono">config.collection</span> (no list-collections endpoint exists, so
            type the name).
          </div>
        </div>

        <div className={styles.fg}>
          <div className={styles.fgH}>
            <span className={styles.lbl}>Memory type</span>
            <span className={styles.all} onClick={onAllTypes}>
              all
            </span>
          </div>
          <div>
            {TYPES.map((t) => {
              const on = types.has(t.k)
              return (
                <div
                  key={t.k}
                  className={`${styles.frow} ${on ? styles.on : ""}`}
                  onClick={() => onToggleType(t.k)}
                >
                  <span className={styles.ck}>
                    <Check size={9} strokeWidth={3.5} />
                  </span>
                  <span className={`${styles.fd} ${styles[t.k]}`} />
                  <span className={styles.fname}>{t.k}</span>
                  <span className={styles.fn}>{t.n}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.fg}>
          <div className={styles.fgH}>
            <span className={styles.lbl}>Category</span>
            <span className={styles.all} onClick={() => onSetCat(null)}>
              all
            </span>
          </div>
          <div className={styles.catList}>
            {CATS.map((c) => (
              <div
                key={c.k}
                className={`${styles.catrow} ${cat === c.k ? styles.on : ""}`}
                onClick={() => onSetCat(c.k)}
              >
                {c.k}
                <span className={styles.fn}>{c.n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
