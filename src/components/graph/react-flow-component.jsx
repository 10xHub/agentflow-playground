import PropTypes from "prop-types"
import { useState } from "react"

import GraphInfoPanel from "@/components/graph/graph-info-panel"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const randomColorGenerator = () => {
  const colors = [
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#f59e42", // orange
    "#fbbf24", // yellow
    "#6366f1", // indigo
    "#0ea5e9", // sky blue
    "#a21caf", // violet
    "#f472b6", // pink
    "#eab308", // gold
    "#64748b", // slate
    "#facc15", // amber
    "#14b8a6", // teal
    "#38bdf8", // light blue
    "#c026d3", // fuchsia
    "#d946ef", // magenta
    "#fcd34d", // light yellow
    "#a3e635", // lime
    "#f472b6", // rose
    "#e879f9", // light violet
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * Transform graph data to Reagraph format
 * @param {object} _graphData - Raw graph data
 * @returns {object} Reagraph nodes and edges
 */
const _transformToReagraphFormat = (_graphData) => {
  if (!_graphData || !_graphData.nodes || !_graphData.edges) {
    return { nodes: [], edges: [] }
  }

  // Create name to ID mapping for edges
  const nameToIdMap = new Map()
  _graphData.nodes.forEach((node) => {
    nameToIdMap.set(node.name, node.id)
  })

  // Transform nodes for Reagraph
  const nodes = _graphData.nodes.map((node) => {
    const isStart =
      node.name.includes("__start__") ||
      node.name.toLowerCase().includes("start")
    const isEnd =
      node.name.includes("__end__") || node.name.toLowerCase().includes("end")

    // Determine node color based on type
    let fill = "#6b7280" // default gray
    if (isStart) {
      fill = "#4CAF50" // green
    } else if (isEnd) {
      fill = "#F44336" // red
    } else {
      fill = randomColorGenerator()
    }

    // change name
    let { name } = node
    let url = ""
    if (isStart) {
      name = "Start"
      url = "https://img.icons8.com/ios-glyphs/30/rocket.png"
    } else if (isEnd) {
      name = "End"
      url = "https://img.icons8.com/comic/100/finish-flag.png"
    } else {
      url = "https://img.icons8.com/glyph-neue/50/bard--v2.png"
    }

    // check tools
    if (name.toLowerCase().includes("tool")) {
      url = "https://img.icons8.com/ios/50/open-end-wrench.png"
    }

    return {
      id: node.id,
      text: name,
      data: node,
      icon: {
        url: url,
        height: 25,
        width: 25,
      },
      fill: fill,
    }
  })

  // Transform edges for Reagraph
  const edges = _graphData.edges.map((edge) => {
    const sourceId = nameToIdMap.get(edge.source) || edge.source
    const targetId = nameToIdMap.get(edge.target) || edge.target

    return {
      id: edge.id,
      from: sourceId,
      to: targetId,
      label: `${edge.source} → ${edge.target}`,
    }
  })

  return { nodes, edges }
}

const getNodeTypeLabel = (node = {}) => {
  const nodeName = node.name || ""

  if (nodeName.includes("__start__")) {
    return "Start node"
  }

  if (nodeName.includes("__end__")) {
    return "End node"
  }

  if (node.mode === "agent") {
    return "Agent node"
  }

  if (node.action || nodeName.toLowerCase().includes("tool")) {
    return "Tool node"
  }

  return "Graph node"
}

const getConnectedNodes = (selectedNode, allNodes, edges) => {
  if (!selectedNode) {
    return []
  }

  const nodeById = new Map(allNodes.map((node) => [node.id, node]))

  return edges
    .filter(
      (edge) => edge.from === selectedNode.id || edge.to === selectedNode.id
    )
    .map((edge) => {
      const connectedNodeId =
        edge.from === selectedNode.id ? edge.to : edge.from

      return nodeById.get(connectedNodeId)
    })
    .filter(Boolean)
}

const NODE_WIDTH = 168
const NODE_HEIGHT = 72
const NODE_GAP_Y = 44
const COLUMN_GAP_X = 88
const CANVAS_PADDING = 32

const buildLayout = (nodes, edges) => {
  if (nodes.length === 0) {
    return {
      positions: new Map(),
      width: NODE_WIDTH + CANVAS_PADDING * 2,
      height: NODE_HEIGHT + CANVAS_PADDING * 2,
    }
  }

  const incoming = new Map(nodes.map((node) => [node.id, 0]))
  const outgoing = new Map(nodes.map((node) => [node.id, []]))

  edges.forEach((edge) => {
    if (!incoming.has(edge.to) || !outgoing.has(edge.from)) {
      return
    }

    incoming.set(edge.to, incoming.get(edge.to) + 1)
    outgoing.get(edge.from).push(edge.to)
  })

  const levels = new Map()
  const queue = []

  nodes.forEach((node) => {
    if (node.data?.name?.includes("__start__") || incoming.get(node.id) === 0) {
      levels.set(node.id, 0)
      queue.push(node.id)
    }
  })

  if (queue.length === 0) {
    levels.set(nodes[0].id, 0)
    queue.push(nodes[0].id)
  }

  const remainingIncoming = new Map(incoming)

  while (queue.length > 0) {
    const currentId = queue.shift()
    const nextLevel = (levels.get(currentId) || 0) + 1

    outgoing.get(currentId)?.forEach((targetId) => {
      levels.set(targetId, Math.max(levels.get(targetId) ?? 0, nextLevel))

      const nextIncoming = (remainingIncoming.get(targetId) || 0) - 1
      remainingIncoming.set(targetId, nextIncoming)

      if (nextIncoming <= 0) {
        queue.push(targetId)
      }
    })
  }

  nodes.forEach((node, index) => {
    if (!levels.has(node.id)) {
      const fallbackLevel = node.data?.name?.includes("__end__")
        ? Math.max(...levels.values(), 0) + 1
        : index + 1
      levels.set(node.id, fallbackLevel)
    }
  })

  const columns = new Map()

  nodes.forEach((node) => {
    const level = levels.get(node.id) || 0
    const columnNodes = columns.get(level) || []
    columnNodes.push(node)
    columns.set(level, columnNodes)
  })

  const positions = new Map()
  const maxColumnSize = Math.max(...columns.values().map((column) => column.length))
  const width =
    Math.max(columns.size, 1) * NODE_WIDTH +
    Math.max(columns.size - 1, 0) * COLUMN_GAP_X +
    CANVAS_PADDING * 2
  const height =
    maxColumnSize * NODE_HEIGHT +
    Math.max(maxColumnSize - 1, 0) * NODE_GAP_Y +
    CANVAS_PADDING * 2

  Array.from(columns.entries())
    .sort((first, second) => first[0] - second[0])
    .forEach(([level, columnNodes]) => {
      const totalColumnHeight =
        columnNodes.length * NODE_HEIGHT +
        Math.max(columnNodes.length - 1, 0) * NODE_GAP_Y
      const columnTop = CANVAS_PADDING + (height - CANVAS_PADDING * 2 - totalColumnHeight) / 2

      columnNodes.forEach((node, index) => {
        positions.set(node.id, {
          x: CANVAS_PADDING + level * (NODE_WIDTH + COLUMN_GAP_X),
          y: columnTop + index * (NODE_HEIGHT + NODE_GAP_Y),
        })
      })
    })

  return { positions, width, height }
}

const buildEdgePath = (fromPosition, toPosition) => {
  const startX = fromPosition.x + NODE_WIDTH
  const startY = fromPosition.y + NODE_HEIGHT / 2
  const endX = toPosition.x
  const endY = toPosition.y + NODE_HEIGHT / 2
  const horizontalGap = Math.abs(endX - startX)
  const curveOffset = Math.max(56, horizontalGap / 2)
  const controlStartX = startX + curveOffset
  const controlEndX = endX - curveOffset

  return `M ${startX} ${startY} C ${controlStartX} ${startY}, ${controlEndX} ${endY}, ${endX} ${endY}`
}

const NodeInspector = ({ selectedNode, connectedNodes }) => {
  const selectedNodeData = selectedNode?.data

  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
      <CardHeader className="space-y-2 pb-4">
        <CardTitle className="text-lg">Node Details</CardTitle>
        <CardDescription>
          Inspect the selected node and its graph connections.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {selectedNodeData ? (
          <>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Selected Node
              </p>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                {selectedNode.text}
              </h3>
            </div>

            <div className="grid gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/80">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Type
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-50">
                  {getNodeTypeLabel(selectedNodeData)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/80">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Node ID
                </p>
                <p className="mt-2 break-all font-mono text-xs text-slate-700 dark:text-slate-200">
                  {selectedNodeData.id}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/80">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Connected Nodes
              </p>
              {connectedNodes.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {connectedNodes.map((node) => (
                    <li
                      key={node.id}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {node.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  No connected nodes found.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
            Select a node to inspect its details.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * ReagraphComponent - Lightweight graph visualization using Reagraph
 * @param {object} props - Component props
 * @param {object} props.graphData - Graph data to visualize
 * @param {object} props.graphInfo - Graph metadata information
 * @returns {object} Reagraph canvas component
 */
const ReFlowComponent = ({ graphData, graphInfo }) => {
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const { nodes, edges } = _transformToReagraphFormat(graphData)
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null
  const connectedNodes = getConnectedNodes(selectedNode, nodes, edges)
  const { positions, width, height } = buildLayout(nodes, edges)

  if (nodes.length === 0) {
    return (
      <div className="grid h-full gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed bg-slate-50 px-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          No graph data available yet.
        </div>

        <div className="space-y-4">
          <NodeInspector selectedNode={null} connectedNodes={[]} />
          <GraphInfoPanel graphInfo={graphInfo || {}} />
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-full gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-h-[32rem] rounded-xl border border-slate-200/80 bg-white/70 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
        <div
          aria-label="Network graph"
          className="relative overflow-auto rounded-lg border border-slate-200/80 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_45%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(241,245,249,0.94))] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_40%),linear-gradient(180deg,_rgba(15,23,42,0.92),_rgba(2,6,23,0.98))]"
        >
          <div
            className="relative min-h-[32rem] min-w-full"
            style={{
              width: `${Math.max(width, 720)}px`,
              height: `${Math.max(height, 512)}px`,
            }}
          >
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${Math.max(width, 720)} ${Math.max(height, 512)}`}
              preserveAspectRatio="xMinYMin meet"
            >
              <defs>
                <marker
                  id="graph-arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="8"
                  refY="5"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                </marker>
              </defs>

              {edges.map((edge) => {
                const fromPosition = positions.get(edge.from)
                const toPosition = positions.get(edge.to)

                if (!fromPosition || !toPosition) {
                  return null
                }

                return (
                  <path
                    key={edge.id}
                    d={buildEdgePath(fromPosition, toPosition)}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2.5"
                    markerEnd="url(#graph-arrowhead)"
                    opacity="0.95"
                  />
                )
              })}
            </svg>

            {nodes.map((node) => {
              const position = positions.get(node.id)

              if (!position) {
                return null
              }

              const isSelected = node.id === selectedNodeId

              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`absolute flex h-[72px] w-[168px] items-center gap-3 rounded-2xl border px-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    isSelected
                      ? "border-sky-500 bg-sky-50 shadow-md dark:border-sky-400 dark:bg-sky-950/40"
                      : "border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-900/95"
                  }`}
                  style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                  }}
                  aria-label={`Select ${node.text}`}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white"
                    style={{ backgroundColor: node.fill }}
                    aria-hidden="true"
                  >
                    {node.text?.charAt(0) || "N"}
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {node.text}
                    </span>
                    <span className="block truncate text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      {getNodeTypeLabel(node.data)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="sr-only">
        {nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => setSelectedNodeId(node.id)}
            aria-label={`Open details for ${node.text}`}
          >
            Open details for {node.text}
          </button>
        ))}
      </div>

      <aside
        aria-label="Graph sidebar"
        className="space-y-4 xl:sticky xl:top-0 xl:max-h-[calc(100vh-12rem)] xl:overflow-auto"
      >
        <NodeInspector
          selectedNode={selectedNode}
          connectedNodes={connectedNodes}
        />
        <GraphInfoPanel graphInfo={graphInfo || {}} />
      </aside>
    </div>
  )
}

NodeInspector.propTypes = {
  selectedNode: PropTypes.shape({
    text: PropTypes.string,
    data: PropTypes.object,
  }),
  connectedNodes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      text: PropTypes.string,
    })
  ).isRequired,
}

NodeInspector.defaultProps = {
  selectedNode: null,
}

ReFlowComponent.propTypes = {
  graphData: PropTypes.object.isRequired,
  graphInfo: PropTypes.object,
}

ReFlowComponent.defaultProps = {
  graphInfo: {},
}

export default ReFlowComponent
