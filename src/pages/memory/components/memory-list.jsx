import { Check, Search, Trash2 } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"
import { useDispatch } from "react-redux"

import { forgetVisible, searchMemories } from "@/store/memory-slice"

import { DISTANCE_METRICS, RETRIEVAL_STRATEGIES } from "../data"
import styles from "../memory.module.css"

// Browse mode does an extra client-side text filter over the loaded rows.
const visibleRows = (list, search, browseFilter) => {
  if (search || !browseFilter.trim()) return list
  return list.filter((m) =>
    m.content.toLowerCase().includes(browseFilter.toLowerCase())
  )
}

// Keyboard parity for the row divs that stay divs to keep the layout intact.
const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault()
    fn()
  }
}

/**
 *
 */
const ListSub = ({ label, armed, count, disabled, onConfirm }) => (
  <div className={styles.listSub}>
    <span>{label}</span>
    <button
      className={`${styles.forget} ${armed ? styles.armed : ""}`}
      onClick={onConfirm}
      disabled={disabled}
    >
      {armed ? (
        <Check size={12} strokeWidth={1.8} />
      ) : (
        <Trash2 size={12} strokeWidth={1.7} />
      )}
      {armed ? `Confirm · forget ${count}?` : "Forget visible"}
    </button>
  </div>
)

ListSub.propTypes = {
  label: PropTypes.string.isRequired,
  armed: PropTypes.bool.isRequired,
  count: PropTypes.number.isRequired,
  disabled: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
}

/**
 *
 */
const RowsPlaceholder = ({ status, error = null, search, empty }) => (
  <>
    {status === "loading" && (
      <div className={styles.memEmpty}>Loading memories…</div>
    )}
    {status === "error" && <div className={styles.memEmpty}>{error}</div>}
    {status === "ready" && empty && (
      <div className={styles.memEmpty}>
        {search
          ? "No results — try another query."
          : "No memories in this collection."}
      </div>
    )}
  </>
)

RowsPlaceholder.propTypes = {
  status: PropTypes.string.isRequired,
  error: PropTypes.string,
  search: PropTypes.bool.isRequired,
  empty: PropTypes.bool.isRequired,
}

/**
 *
 */
const ModeTabs = ({ mode, onSetMode }) => (
  <div className={styles.modeseg}>
    <button
      className={mode === "browse" ? styles.on : ""}
      onClick={() => onSetMode("browse")}
    >
      Browse loaded
    </button>
    <button
      className={mode === "search" ? styles.on : ""}
      onClick={() => onSetMode("search")}
    >
      Search
    </button>
  </div>
)

ModeTabs.propTypes = {
  mode: PropTypes.string.isRequired,
  onSetMode: PropTypes.func.isRequired,
}

/**
 *
 */
const SearchControls = ({
  searchInput,
  onSearchInput,
  onRunSearch,
  strategy,
  onSetStrategy,
  metric,
  onSetMetric,
}) => (
  <>
    <div className={styles.search}>
      <Search size={14} strokeWidth={1.7} />
      <input
        placeholder="Semantic query… (press Enter)"
        spellCheck={false}
        value={searchInput}
        onChange={(e) => onSearchInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onRunSearch()}
      />
    </div>
    <div className={styles.row2}>
      <select
        className={styles.sel}
        title="retrieval_strategy"
        value={strategy}
        onChange={(e) => onSetStrategy(e.target.value)}
      >
        {RETRIEVAL_STRATEGIES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <select
        className={styles.sel}
        title="distance_metric"
        value={metric}
        onChange={(e) => onSetMetric(e.target.value)}
      >
        {DISTANCE_METRICS.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
    </div>
  </>
)

SearchControls.propTypes = {
  searchInput: PropTypes.string.isRequired,
  onSearchInput: PropTypes.func.isRequired,
  onRunSearch: PropTypes.func.isRequired,
  strategy: PropTypes.string.isRequired,
  onSetStrategy: PropTypes.func.isRequired,
  metric: PropTypes.string.isRequired,
  onSetMetric: PropTypes.func.isRequired,
}

/**
 *
 */
const MemoryRow = ({ m, search, active, onSelect }) => (
  <div
    className={`${styles.mrow} ${active ? styles.active : ""}`}
    role="button"
    tabIndex={0}
    onClick={() => onSelect(m.id)}
    onKeyDown={keyActivate(() => onSelect(m.id))}
  >
    <div className={styles.mrowTop}>
      <span className={styles.tbadge}>
        <span className={`${styles.fd} ${styles[m.type]}`} />
        {m.type}
      </span>
      {search && (
        <span className={styles.mrowScore}>
          <span className={styles.bar}>
            <i style={{ width: `${Math.round(m.score * 100)}%` }} />
          </span>
          <span className={styles.n}>{m.score.toFixed(2)}</span>
        </span>
      )}
    </div>
    <div className={styles.mrowText}>{m.content}</div>
    <div className={styles.mrowMeta}>
      {m.meta.memory_key && (
        <>
          <span className={styles.mk}>{m.meta.memory_key}</span>
          <span>·</span>
        </>
      )}
      <span>{m.cat}</span>
      <span>· {m.ts.split(" ")[0]}</span>
    </div>
  </div>
)

MemoryRow.propTypes = {
  m: PropTypes.shape({
    id: PropTypes.string,
    type: PropTypes.string,
    cat: PropTypes.string,
    content: PropTypes.string,
    score: PropTypes.number,
    ts: PropTypes.string,
    meta: PropTypes.object,
  }).isRequired,
  search: PropTypes.bool.isRequired,
  active: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
}

/**
 *
 */
const MemoryList = ({
  mode,
  onSetMode,
  strategy,
  onSetStrategy,
  metric,
  onSetMetric,
  cat = null,
  list,
  total,
  status,
  error = null,
  query = "",
  activeId = null,
  onSelect,
}) => {
  const dispatch = useDispatch()
  const [forgetArmed, setForgetArmed] = useState(false)
  const [browseFilter, setBrowseFilter] = useState("")
  const [searchInput, setSearchInput] = useState(query)
  const [prevQuery, setPrevQuery] = useState(query)
  const search = mode === "search"

  // The input mirrors the store query whenever the store query changes.
  if (prevQuery !== query) {
    setPrevQuery(query)
    setSearchInput(query)
  }

  const runSearch = () => {
    if (searchInput.trim()) dispatch(searchMemories(searchInput.trim()))
  }

  const confirmForget = () => {
    if (forgetArmed) {
      dispatch(forgetVisible())
      setForgetArmed(false)
    } else {
      setForgetArmed(true)
    }
  }

  const shown = visibleRows(list, search, browseFilter)

  const subLabel = search
    ? `${shown.length} results · scored by ${strategy}`
    : `${shown.length} of ${total} loaded${cat ? ` · ${cat}` : ""}`

  return (
    <section className={styles.list}>
      <div className={styles.listHead}>
        <ModeTabs mode={mode} onSetMode={onSetMode} />

        {mode === "browse" ? (
          <div className={styles.search}>
            <Search size={14} strokeWidth={1.7} />
            <input
              placeholder="Filter loaded memories by content…"
              spellCheck={false}
              value={browseFilter}
              onChange={(e) => setBrowseFilter(e.target.value)}
            />
          </div>
        ) : (
          <SearchControls
            searchInput={searchInput}
            onSearchInput={setSearchInput}
            onRunSearch={runSearch}
            strategy={strategy}
            onSetStrategy={onSetStrategy}
            metric={metric}
            onSetMetric={onSetMetric}
          />
        )}
      </div>

      <ListSub
        label={subLabel}
        armed={forgetArmed}
        count={shown.length}
        disabled={!shown.length}
        onConfirm={confirmForget}
      />

      <div className={styles.rows}>
        <RowsPlaceholder
          status={status}
          error={error}
          search={search}
          empty={shown.length === 0}
        />
        {shown.map((m) => (
          <MemoryRow
            key={m.id}
            m={m}
            search={search}
            active={m.id === activeId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
}

MemoryList.propTypes = {
  mode: PropTypes.string.isRequired,
  onSetMode: PropTypes.func.isRequired,
  strategy: PropTypes.string.isRequired,
  onSetStrategy: PropTypes.func.isRequired,
  metric: PropTypes.string.isRequired,
  onSetMetric: PropTypes.func.isRequired,
  cat: PropTypes.string,
  list: PropTypes.arrayOf(PropTypes.object).isRequired,
  total: PropTypes.number.isRequired,
  status: PropTypes.string.isRequired,
  error: PropTypes.string,
  query: PropTypes.string,
  activeId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
}

export default MemoryList
