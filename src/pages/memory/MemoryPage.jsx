import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import {
  browseMemories,
  setCollection,
  setMetric,
  setMode,
  setStrategy,
} from "@/store/memorySlice"

import FacetsColumn from "./components/FacetsColumn"
import MemoryDetail from "./components/MemoryDetail"
import MemoryList from "./components/MemoryList"
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

export default function MemoryPage() {
  const dispatch = useDispatch()
  const { items, mode, strategy, metric, collection, selectedId, status, error, query } =
    useSelector((s) => s.memory)

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
    setTypes((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

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
        onSetCat={(k) => setCat((cur) => (cur === k ? null : k))}
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
        onSelect={(id) => dispatch({ type: "memory/selectMemory", payload: id })}
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
