import { useMemo, useState } from "react"

import FacetsColumn from "./components/FacetsColumn"
import MemoryDetail from "./components/MemoryDetail"
import MemoryList from "./components/MemoryList"
import { MEM, SCOPE, TYPES } from "./data"
import styles from "./memory.module.css"

const SEARCH_QUERY = "what does the user like to drink"

export default function MemoryPage() {
  const [mode, setMode] = useState("browse")
  const [types, setTypes] = useState(() => new Set(TYPES.map((t) => t.k)))
  const [cat, setCat] = useState(null)
  const [collection, setCollection] = useState("agentflow_memories")
  const [strategy, setStrategy] = useState("SIMILARITY")
  const [metric, setMetric] = useState("cosine")
  const [selectedId, setSelectedId] = useState(MEM[0].id)

  const list = useMemo(
    () => MEM.filter((m) => types.has(m.type) && (!cat || m.cat === cat)),
    [types, cat]
  )

  // Keep a valid selection: if the current pick fell out of the filtered set,
  // fall back to the first visible row (mirrors the mockup's renderList()).
  const activeId = list.some((m) => m.id === selectedId)
    ? selectedId
    : list.length
      ? list[0].id
      : null
  const activeMem = MEM.find((m) => m.id === activeId) || null

  const toggleType = (k) =>
    setTypes((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const allTypes = () => setTypes(new Set(TYPES.map((t) => t.k)))
  const handleSetCat = (k) => setCat((cur) => (cur === k ? null : k))

  const handleCollectionChange = (raw) => {
    const c = (raw || "").trim() || "agentflow_memories"
    setCollection(c)
  }

  return (
    <div className={styles.page}>
      <FacetsColumn
        collection={collection}
        onCollectionChange={handleCollectionChange}
        loaded={SCOPE.loaded}
        types={types}
        onToggleType={toggleType}
        onAllTypes={allTypes}
        cat={cat}
        onSetCat={handleSetCat}
      />

      <MemoryList
        mode={mode}
        onSetMode={setMode}
        strategy={strategy}
        onSetStrategy={setStrategy}
        metric={metric}
        onSetMetric={setMetric}
        cat={cat}
        list={list}
        activeId={activeId}
        onSelect={setSelectedId}
      />

      {activeMem && (
        <MemoryDetail
          mem={activeMem}
          mode={mode}
          strategy={strategy}
          metric={metric}
          collection={collection}
          query={SEARCH_QUERY}
        />
      )}
    </div>
  )
}
