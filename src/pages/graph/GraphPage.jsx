import { useState } from "react"

import GraphCanvas from "./components/GraphCanvas"
import GraphInfoPane from "./components/GraphInfoPane"
import NodePane from "./components/NodePane"
import { GRAPH_META } from "./data"
import styles from "./graph.module.css"

export default function GraphPage() {
  // agent selected by default, mirroring the mockup (it selects `tools`,
  // but the live-run canvas + node detail read most naturally from `tools`).
  const [selected, setSelected] = useState("tools")
  const [tab, setTab] = useState("node")
  const [live, setLive] = useState(true)

  // Clicking a node box updates the Node tab detail and switches to it.
  const selectNode = (name) => {
    setSelected(name)
    setTab("node")
  }

  return (
    <>
      <div className={styles.main}>
        <div className={styles.gHead}>
          <div className={styles.gTitle}>
            Graph{" "}
            <span className={styles.sub}>
              {GRAPH_META.ref} · {GRAPH_META.nodeCount} nodes ·{" "}
              {GRAPH_META.edgeCount} edges
            </span>
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

        <GraphCanvas selected={selected} onSelect={selectNode} live={live} />
      </div>

      <aside className={styles.panel}>
        <div className={styles.pTabs}>
          <button
            className={tab === "node" ? styles.on : ""}
            onClick={() => setTab("node")}
          >
            Node
          </button>
          <button
            className={tab === "graph" ? styles.on : ""}
            onClick={() => setTab("graph")}
          >
            Graph info
          </button>
        </div>
        <div className={styles.pBody}>
          {tab === "node" ? <NodePane name={selected} /> : <GraphInfoPane />}
        </div>
      </aside>
    </>
  )
}
