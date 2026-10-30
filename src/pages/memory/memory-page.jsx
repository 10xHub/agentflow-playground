import { DatabaseZap } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import {
  applyFilters,
  browseMemories,
  setMetric,
  setMode,
  setStrategy,
} from "@/store/memory-slice"

import FacetsColumn from "./components/facets-column"
import MemoryDetail from "./components/memory-detail"
import MemoryFormPane from "./components/memory-form-pane"
import MemoryList from "./components/memory-list"
import { MEMORY_TYPES } from "./data"
import styles from "./memory.module.css"

const ALL_TYPES = MEMORY_TYPES

/**
 *
 */
const MemoryPage = () => {
  const dispatch = useDispatch()
  const {
    items,
    mode,
    strategy,
    metric,
    selectedId,
    status,
    error,
    query,
    keywordMatch,
    filters,
  } = useSelector((s) => s.memory)

  // Facets live in the store: a search sends them to the server as filters, and
  // the loaded rows are narrowed the same way for browse and multi-type picks.
  const types = useMemo(
    () => new Set(filters.types ?? ALL_TYPES),
    [filters.types]
  )
  const { cat } = filters
  const [formMode, setFormMode] = useState(null) // null | "create" | "edit"

  // Load memories on mount.
  useEffect(() => {
    dispatch(browseMemories())
  }, [dispatch])

  // Live facet counts from the loaded items.
  const typeCounts = useMemo(() => {
    const c = {}
    items.forEach((m) => {
      c[m.type] = (c[m.type] || 0) + 1
    })
    return ALL_TYPES.map((k) => ({ k, n: c[k] || 0 }))
  }, [items])

  const catCounts = useMemo(() => {
    const c = {}
    items.forEach((m) => {
      c[m.cat] = (c[m.cat] || 0) + 1
    })
    if (cat && !c[cat]) c[cat] = 0
    return Object.entries(c).map(([k, n]) => ({ k, n }))
  }, [items, cat])

  // Browse filters the loaded rows; search also narrows by server filters.
  const list = useMemo(
    () => items.filter((m) => types.has(m.type) && (!cat || m.cat === cat)),
    [items, types, cat]
  )

  const activeId = list.some((m) => m.id === selectedId)
    ? selectedId
    : list.length
      ? list[0].id
      : null
  const activeMem = items.find((m) => m.id === activeId) || null

  const setTypes = (next) =>
    dispatch(
      applyFilters({ types: next.length === ALL_TYPES.length ? null : next })
    )

  const toggleType = (k) =>
    setTypes(ALL_TYPES.filter((t) => (t === k ? !types.has(t) : types.has(t))))

  // No store backend wired for this agent — the API answered 503 "Store is not
  // configured". Show a single explanatory panel instead of the empty inspector.
  if (status === "unconfigured") {
    return (
      <div className={styles.unconfiguredPage}>
        <div className={styles.unconfigured}>
          <DatabaseZap size={30} strokeWidth={1.5} />
          <h2>Memory not configured</h2>
          <p>
            This agent has no memory store wired up, so there are no memories to
            inspect.
          </p>
          <p className={styles.unconfiguredHint}>
            Set a <code>store</code> in your <code>10xgraph.json</code> (for
            example a <code>QdrantStore</code> or <code>Mem0Store</code>) and
            restart the API server, then reload this page.
          </p>
          <button
            type="button"
            className={styles.unconfiguredRetry}
            onClick={() => dispatch(browseMemories())}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <FacetsColumn
        loaded={`${items.length} / ${items.length}`}
        types={types}
        typeCounts={typeCounts}
        onToggleType={toggleType}
        onAllTypes={() => setTypes(ALL_TYPES)}
        cat={cat}
        catCounts={catCounts}
        onSetCat={(k) => dispatch(applyFilters({ cat: cat === k ? null : k }))}
        minScore={filters.minScore}
        onMinScore={(v) => dispatch(applyFilters({ minScore: v }))}
        searching={mode === "search"}
        onReload={() => dispatch(browseMemories())}
      />

      <MemoryList
        mode={mode}
        onSetMode={(m) => dispatch(setMode(m))}
        strategy={strategy}
        onSetStrategy={(s) => dispatch(setStrategy(s))}
        metric={metric}
        onSetMetric={(m) => dispatch(setMetric(m))}
        cat={cat}
        list={list}
        total={items.length}
        status={status}
        error={error}
        query={query}
        activeId={activeId}
        onSelect={(id) => {
          setFormMode(null)
          dispatch({ type: "memory/selectMemory", payload: id })
        }}
        onNew={() => setFormMode("create")}
      />

      {formMode && (
        <MemoryFormPane
          mode={formMode}
          mem={activeMem}
          onClose={() => setFormMode(null)}
        />
      )}

      {!formMode && activeMem && (
        <MemoryDetail
          onEdit={() => setFormMode("edit")}
          mem={activeMem}
          mode={mode}
          strategy={keywordMatch ? "keyword match (recorded demo)" : strategy}
          metric={keywordMatch ? "none" : metric}
          query={query}
        />
      )}
    </div>
  )
}

export default MemoryPage
