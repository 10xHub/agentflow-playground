import { useMemo } from "react"
import { Canvas, Edge, Node } from "reaflow"

import { useIsMobile } from "@/hooks/use-is-mobile"

import styles from "../graph.module.css"

// elk layout tweak — keep self-loops (TOOL -> TOOL etc.) from being drawn inside
// the node box.
const LAYOUT_OPTIONS = {
  "org.eclipse.elk.insideSelfLoops.activate": "false",
}

// Categorical palette for agent/graph nodes (start/end/tool get fixed colors).
const PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#f59e42",
  "#6366f1",
  "#0ea5e9",
  "#14b8a6",
  "#f472b6",
  "#eab308",
]

const isStart = (name = "") => name.includes("__start__")
const isEnd = (name = "") => name.includes("__end__")

export const displayName = (name = "") => {
  if (isStart(name)) return "Start"
  if (isEnd(name)) return "End"
  return name
}

export const typeLabel = (name = "") => {
  if (isStart(name)) return "Start node"
  if (isEnd(name)) return "End node"
  if (name.toLowerCase().includes("tool")) return "Tool node"
  return "Agent node"
}

const nodeColor = (name = "", index) => {
  if (isStart(name)) return "#22c55e"
  if (isEnd(name)) return "#ef4444"
  if (name.toLowerCase().includes("tool")) return "#a855f7"
  return PALETTE[index % PALETTE.length]
}

/**
 * Live graph canvas driven by real API nodes/edges. reaflow + elk auto-lay-out
 * the DAG (drag to pan, scroll to zoom, click a node to select). Ported from the
 * legacy view: colored node avatars, type labels, selection highlight, and the
 * live-run ring on the node currently executing in the active chat stream.
 */
export default function GraphCanvas({
  nodes,
  edges,
  selected,
  onSelect,
  live,
  activeNode,
}) {
  const isMobile = useIsMobile()

  // Map node name -> stable uuid so edges (which reference names) resolve to ids.
  const rfNodes = useMemo(() => {
    return nodes.map((n, index) => ({
      id: n.id,
      text: displayName(n.name),
      width: isMobile ? 168 : 208,
      height: isMobile ? 64 : 72,
      data: {
        name: n.name,
        color: nodeColor(n.name, index),
        typeLabel: typeLabel(n.name),
      },
    }))
  }, [nodes, isMobile])

  const nameToId = useMemo(() => {
    const m = new Map()
    nodes.forEach((n) => m.set(n.name, n.id))
    return m
  }, [nodes])

  const rfEdges = useMemo(
    () =>
      (edges || []).map((e) => ({
        id: e.id,
        from: nameToId.get(e.source) || e.source,
        to: nameToId.get(e.target) || e.target,
      })),
    [edges, nameToId]
  )

  // Resolve the active chat node (a name) to its uuid for the live ring.
  const activeId = activeNode ? nameToId.get(activeNode) : null

  if (!nodes.length) {
    return (
      <div className={styles.canvasWrap}>
        <div className={styles.canvasEmpty}>
          No graph loaded — connect to a backend.
        </div>
      </div>
    )
  }

  return (
    <div className={styles.canvasWrap}>
      <Canvas
        className={styles.reaflow}
        nodes={rfNodes}
        edges={rfEdges}
        direction="DOWN"
        layoutOptions={LAYOUT_OPTIONS}
        fit
        panType="drag"
        zoomable
        readonly
        maxZoom={1.4}
        minZoom={-0.6}
        selections={selected ? [selected] : []}
        onCanvasClick={(event) => {
          if (event.target === event.currentTarget) onSelect(null)
        }}
        node={(nodeProps) => (
          <Node
            {...nodeProps}
            rx={14}
            ry={14}
            className={styles.rfNode}
            label={null}
            selectable
            removable={false}
            draggable={false}
            linkable={false}
            onClick={(_e, n) => onSelect(n.id)}
          >
            {({ width, height, node: n }) => {
              const isSel = n.id === selected
              const isActive = live && n.id === activeId
              return (
                <foreignObject width={width} height={height} x={0} y={0}>
                  <button
                    type="button"
                    aria-label={`Select ${n.text}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelect(n.id)
                    }}
                    className={[
                      styles.rfCard,
                      isSel ? styles.rfCardSel : "",
                      isActive ? styles.rfCardActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {isActive && <span className={styles.rfRun}>running</span>}
                    <span
                      className={styles.rfAvatar}
                      style={{ backgroundColor: n.data?.color }}
                    >
                      {(n.text || "N").charAt(0).toUpperCase()}
                    </span>
                    <span className={styles.rfText}>
                      <span className={styles.rfName}>{n.text}</span>
                      <span className={styles.rfType}>
                        {n.data?.typeLabel || "Graph node"}
                      </span>
                    </span>
                  </button>
                </foreignObject>
              )
            }}
          </Node>
        )}
        edge={(edgeProps) => (
          <Edge {...edgeProps} className={styles.reaflowEdge} />
        )}
      />
    </div>
  )
}
