import PropTypes from "prop-types"
import { useMemo, useState } from "react"
import { Canvas, Edge, Node } from "reaflow"

import GraphInfoPanel from "@/components/graph/graph-info-panel"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const COLOR_PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#f59e42",
  "#6366f1",
  "#0ea5e9",
  "#14b8a6",
  "#f472b6",
  "#eab308",
]

const getNodeDisplayName = (node) => {
  const name = node.name || ""
  if (name.includes("__start__")) return "Start"
  if (name.includes("__end__")) return "End"
  return name
}

const getNodeColor = (node, index) => {
  const name = (node.name || "").toLowerCase()
  if (name.includes("__start__")) return "#22c55e"
  if (name.includes("__end__")) return "#ef4444"
  if (name.includes("tool") || node.action) return "#a855f7"
  return COLOR_PALETTE[index % COLOR_PALETTE.length]
}

const getNodeTypeLabel = (node = {}) => {
  const name = node.name || ""
  if (name.includes("__start__")) return "Start node"
  if (name.includes("__end__")) return "End node"
  if (node.mode === "agent") return "Agent node"
  if (node.action || (node.name || "").toLowerCase().includes("tool")) {
    return "Tool node"
  }
  return "Graph node"
}

const transformGraphData = (graphData) => {
  if (!graphData?.nodes?.length) return { nodes: [], edges: [] }

  const nameToIdMap = new Map()
  graphData.nodes.forEach((node) => nameToIdMap.set(node.name, node.id))

  const nodes = graphData.nodes.map((node, index) => ({
    id: node.id,
    text: getNodeDisplayName(node),
    width: 200,
    height: 76,
    data: {
      ...node,
      _color: getNodeColor(node, index),
      _typeLabel: getNodeTypeLabel(node),
    },
  }))

  const edges = (graphData.edges || []).map((edge) => ({
    id: edge.id,
    from: nameToIdMap.get(edge.source) || edge.source,
    to: nameToIdMap.get(edge.target) || edge.target,
  }))

  return { nodes, edges }
}

const getConnectedNodes = (selectedNodeId, nodes, edges) => {
  if (!selectedNodeId) return []

  const connectedNodeIds = new Set()

  edges.forEach((edge) => {
    if (edge.from === selectedNodeId) connectedNodeIds.add(edge.to)
    if (edge.to === selectedNodeId) connectedNodeIds.add(edge.from)
  })

  return nodes.filter((node) => connectedNodeIds.has(node.id))
}

const NodeInspector = ({ selectedNode, connectedNodes }) => {
  const nodeData = selectedNode?.data

  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
      <CardHeader className="space-y-2 pb-4">
        <CardTitle className="text-lg">Node Details</CardTitle>
        <CardDescription>
          Inspect the selected node and its graph connections.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {nodeData ? (
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
                  {getNodeTypeLabel(nodeData)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/80">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Node ID
                </p>
                <p className="mt-2 break-all font-mono text-xs text-slate-700 dark:text-slate-200">
                  {nodeData.id}
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

NodeInspector.propTypes = {
  selectedNode: PropTypes.shape({
    id: PropTypes.string,
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

const ReFlowComponent = ({ graphData, graphInfo }) => {
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const { nodes, edges } = transformGraphData(graphData)

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  )

  const connectedNodes = useMemo(
    () => getConnectedNodes(selectedNodeId, nodes, edges),
    [edges, nodes, selectedNodeId]
  )

  const handleNodeSelect = (_, node) => {
    setSelectedNodeId(node.id)
  }

  if (nodes.length === 0) {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
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
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div
        aria-label="Network graph"
        className="h-[calc(100dvh-16rem)] min-h-[28rem] max-h-[48rem]"
      >
        <Canvas
          className="size-full overflow-hidden"
          nodes={nodes}
          edges={edges}
          direction="DOWN"
          fit
          pannable={false}
          readonly
          zoomable={false}
          selections={selectedNodeId ? [selectedNodeId] : []}
          onCanvasClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedNodeId(null)
            }
          }}
          node={(nodeProperties) => (
            <Node
              {...nodeProperties}
              rx={12}
              ry={12}
              style={{ fill: "#1e293b", stroke: "#334155", strokeWidth: 1 }}
              label={null}
              selectable
              removable={false}
              draggable={false}
              linkable={false}
              onClick={handleNodeSelect}
            >
              {({ width, height, node: n }) => (
                <foreignObject width={width} height={height} x={0} y={0}>
                  <button
                    type="button"
                    aria-label={`Open details for ${n.text}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedNodeId(n.id)
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "0 16px",
                      width: "100%",
                      height: "100%",
                      boxSizing: "border-box",
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: n.data?._color || "#6b7280",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 14,
                        flexShrink: 0,
                        // eslint-disable-next-line sonarjs/no-duplicate-string
                        fontFamily: "system-ui, sans-serif",
                      }}
                    >
                      {(n.text || "N").charAt(0).toUpperCase()}
                    </span>
                    <span style={{ overflow: "hidden", flex: 1 }}>
                      <span
                        style={{
                          display: "block",
                          fontWeight: 600,
                          fontSize: 14,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "#f1f5f9",
                          fontFamily: "system-ui, sans-serif",
                        }}
                      >
                        {n.text}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.18em",
                          color: "#94a3b8",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontFamily: "system-ui, sans-serif",
                        }}
                      >
                        {n.data?._typeLabel || "Graph Node"}
                      </span>
                    </span>
                  </button>
                </foreignObject>
              )}
            </Node>
          )}
          edge={(edgeProperties) => <Edge {...edgeProperties} />}
        />
      </div>

      <aside
        aria-label="Graph sidebar"
        className="space-y-4 xl:sticky xl:top-0"
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

ReFlowComponent.propTypes = {
  graphData: PropTypes.object.isRequired,
  graphInfo: PropTypes.object,
}

ReFlowComponent.defaultProps = {
  graphInfo: {},
}

export default ReFlowComponent
