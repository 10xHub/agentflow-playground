import { Check, RotateCcw } from "lucide-react"
import PropTypes from "prop-types"

import styles from "../memory.module.css"

// Keyboard parity for the div/span rows that stay divs to keep the layout intact.
const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault()
    fn()
  }
}

/**
 *
 */
const FacetsColumn = ({
  loaded,
  types,
  typeCounts,
  onToggleType,
  onAllTypes,
  cat = null,
  catCounts,
  onSetCat,
  onReload,
  minScore = 0,
  onMinScore = undefined,
  searching = false,
}) => {
  return (
    <aside className={styles.facets}>
      <div className={styles.facetsScroll}>
        <div className={styles.scopeCard}>
          <div className={styles.scopeH}>
            <span className={styles.t}>Store scope</span>
            <button className={styles.reload} type="button" onClick={onReload}>
              <RotateCcw size={11} />
              Reload
            </button>
          </div>

          <div className={styles.skv}>
            <span className={styles.k}>collection</span>
            <span className={styles.v}>set in code</span>
          </div>

          <div className={styles.skv}>
            <span className={styles.k}>user_id</span>
            <span className={styles.v}>from token</span>
          </div>
          <div className={styles.skv}>
            <span className={styles.k}>loaded</span>
            <span className={styles.v}>{loaded}</span>
          </div>

          <div className={styles.scopeNote}>
            <b>Token-scoped.</b> The store API pins{" "}
            <span className="mono">user_id</span> to the connected token
            server-side; there is no cross-user list. The server owns the
            collection (set in code or in the store config). The playground
            cannot change it.
          </div>
        </div>

        {onMinScore && (
          <div className={styles.fg}>
            <div className={styles.fgH}>
              <span className={styles.lbl}>Min score</span>
              <span className={styles.fn}>{minScore.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={minScore}
              disabled={!searching}
              aria-label="Minimum score"
              onChange={(e) => onMinScore(Number(e.target.value))}
            />
            <div className={styles.scopeNote}>
              {searching
                ? "Sent to the store with the search."
                : "Applies to search results only."}
            </div>
          </div>
        )}

        <div className={styles.fg}>
          <div className={styles.fgH}>
            <span className={styles.lbl}>Memory type</span>
            <span
              className={styles.all}
              role="button"
              tabIndex={0}
              onClick={onAllTypes}
              onKeyDown={keyActivate(onAllTypes)}
            >
              all
            </span>
          </div>
          <div>
            {typeCounts.map((t) => {
              const on = types.has(t.k)
              return (
                <div
                  key={t.k}
                  className={`${styles.frow} ${on ? styles.on : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onToggleType(t.k)}
                  onKeyDown={keyActivate(() => onToggleType(t.k))}
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
            <span
              className={styles.all}
              role="button"
              tabIndex={0}
              onClick={() => onSetCat(null)}
              onKeyDown={keyActivate(() => onSetCat(null))}
            >
              all
            </span>
          </div>
          <div className={styles.catList}>
            {catCounts.length === 0 && <div className={styles.catrow}>—</div>}
            {catCounts.map((c) => (
              <div
                key={c.k}
                className={`${styles.catrow} ${cat === c.k ? styles.on : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => onSetCat(c.k)}
                onKeyDown={keyActivate(() => onSetCat(c.k))}
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

FacetsColumn.propTypes = {
  loaded: PropTypes.node.isRequired,
  types: PropTypes.instanceOf(Set).isRequired,
  typeCounts: PropTypes.arrayOf(
    PropTypes.shape({
      k: PropTypes.string.isRequired,
      n: PropTypes.number.isRequired,
    })
  ).isRequired,
  onToggleType: PropTypes.func.isRequired,
  onAllTypes: PropTypes.func.isRequired,
  cat: PropTypes.string,
  catCounts: PropTypes.arrayOf(
    PropTypes.shape({
      k: PropTypes.string.isRequired,
      n: PropTypes.number.isRequired,
    })
  ).isRequired,
  onSetCat: PropTypes.func.isRequired,
  onReload: PropTypes.func.isRequired,
  minScore: PropTypes.number,
  onMinScore: PropTypes.func,
  searching: PropTypes.bool,
}

export default FacetsColumn
