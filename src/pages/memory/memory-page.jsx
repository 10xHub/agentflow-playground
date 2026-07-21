import { DatabaseZap } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import {
  browseMemories,
  setCollection,
  setMetric,
  setMode,
  setStrategy,
} from "@/store/memory-slice"

import FacetsColumn from "./components/facets-column"
import MemoryDetail from "./components/memory-detail"
import MemoryList from "./components/memory-list"
import styles from "./memory.module.css"

const ALL_TYPES = [
  "episodic",
  "semantic",
  "procedural",
  "entity",
  "relationship",
  "declarative",
  "custom",
]

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
    collection,
    selectedId,
    status,
    error,
    query,
  } = useSelector((s) => s.memory)

  // Local facet UI state (client-side filtering over the loaded set).
  const [types, setTypes] = useState(() => new Set(ALL_TYPES))
  const [cat, setCat] = useState(null)

  // Load memories on mount and whenever the collection changes.
  useEffect(() => {
    dispatch(browseMemories())
  }, [dispatch, collection])

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
    return Object.entries(c).map(([k, n]) => ({ k, n }))
  }, [items])

  // Client-side filter for browse mode; search results are shown as returned.
  const list = useMemo(
    () =>
      mode === "search"
        ? items
        : items.filter((m) => types.has(m.type) && (!cat || m.cat === cat)),
    [items, types, cat, mode]
  )

  const activeId = list.some((m) => m.id === selectedId)
    ? selectedId
    : list.length
      ? list[0].id
      : null
  const activeMem = items.find((m) => m.id === activeId) || null

  const toggleType = (k) =>
    setTypes((previous) => {
      const next = new Set(previous)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

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
            Set a <code>store</code> in your <code>agentflow.json</code> (for
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
        collection={collection}
        onCollectionChange={(c) => dispatch(setCollection(c))}
        loaded={`${items.length} / ${items.length}`}
        types={types}
        typeCounts={typeCounts}
        onToggleType={toggleType}
        onAllTypes={() => setTypes(new Set(ALL_TYPES))}
        cat={cat}
        catCounts={catCounts}
        onSetCat={(k) => setCat((current) => (current === k ? null : k))}
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
        onSelect={(id) =>
          dispatch({ type: "memory/selectMemory", payload: id })
        }
      />

      {activeMem && (
        <MemoryDetail
          mem={activeMem}
          mode={mode}
          strategy={strategy}
          metric={metric}
          collection={collection}
          query={query}
        />
      )}
    </div>
  )
}

export default MemoryPage
