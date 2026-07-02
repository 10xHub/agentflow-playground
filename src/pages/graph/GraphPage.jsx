import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { loadGraph } from "@/store/graphSlice"

import GraphCanvas from "./components/GraphCanvas"
import GraphInfoPane from "./components/GraphInfoPane"
import NodePane from "./components/NodePane"
import styles from "./graph.module.css"

export default function GraphPage() {
  const dispatch = useDispatch()
  const { info, nodes, edges, status, error } = useSelector((s) => s.graph)
  // The node currently executing in the active chat run (for live highlight).
  const activeAgent = useSelector((s) => {
    const last = [...s.chat.messages].reverse().find((m) => m.role === "agent")
    return last?.streaming ? last.node : null
  })

  // Selection is by node id (stable uuid), matching the reaflow canvas.
  const [selectedId, setSelectedId] = useState(null)
  const [live, setLive] = useState(true)

  // Load the real graph on mount (and whenever we reconnect).
  useEffect(() => {
    dispatch(loadGraph())
  }, [dispatch])

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) || null,
    [nodes, selectedId]
  )

  const nodeCount = info?.node_count ?? nodes.length
  const edgeCount = info?.edge_count ?? edges.length

  const subtitle =
    status === "loading"
      ? "loading…"
      : status === "error"
        ? error || "failed to load"
        : `${nodeCount} nodes · ${edgeCount} edges`

  return (
    <>
      <div className={styles.main}>
        <div className={styles.gHead}>
          <div className={styles.gTitle}>
            Graph <span className={styles.sub}>{subtitle}</span>
          </div>
          <div className={styles.gRight}>
            <label className={styles.liveToggle}>
              Highlight live run
              <span className={styles.switch}>
                <input
                  type="checkbox"
                  checked={live}
                  onChange={(e) => setLive(e.target.checked)}
                />
                <span className={styles.slider} />
              </span>
            </label>
          </div>
        </div>

        <GraphCanvas
          nodes={nodes}
          edges={edges}
          selected={selectedId}
          onSelect={setSelectedId}
          live={live}
          activeNode={activeAgent}
        />
      </div>

      <aside className={styles.panel}>
        <div className={styles.pBody}>
          <NodePane node={selectedNode} nodes={nodes} edges={edges} />
          <GraphInfoPane />
        </div>
      </aside>
    </>
  )
}
