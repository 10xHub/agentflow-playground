import PropTypes from "prop-types"
import { useId, useMemo } from "react"

const NODE_WIDTH = 184
const NODE_HEIGHT = 64
const NODE_PADDING = 48
const COLUMN_GAP = 132
const ROW_GAP = 44
const CURVE_OFFSET = 56
const MIN_GRAPH_WIDTH = 640
const MIN_GRAPH_HEIGHT = 360
const EMPTY_STATE = "No graph data available yet."

const NODE_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#f59e42",
  "#fbbf24",
  "#6366f1",
  "#0ea5e9",
  "#14b8a6",
  "#c026d3",
  "#64748b",
  "#a3e635",
]

const hashValue = (value = "") => {
  let hash = 0

  for (const character of value) {
    hash = (hash << 5) - hash + character.charCodeAt(0)
    hash |= 0
  }

  return Math.abs(hash)
}

const getNodeKind = (name = "") => {
  const normalizedName = name.toLowerCase()

  if (
    normalizedName.includes("__start__") ||
    normalizedName.includes("start")
  ) {
    return "start"
  }

  if (normalizedName.includes("__end__") || normalizedName.includes("end")) {
    return "end"
  }

  if (normalizedName.includes("tool")) {
    return "tool"
  }

  return "node"
}

const getNodeLabel = (name = "") => {
  const kind = getNodeKind(name)

  if (kind === "start") {
    return "Start"
  }

  if (kind === "end") {
    return "End"
  }

  return name || "Unnamed node"
}

const getNodeBadge = (kind) => {
  if (kind === "start") {
    return "S"
  }

  if (kind === "end") {
    return "E"
  }

  if (kind === "tool") {
    return "T"
  }

  return "N"
}

const getNodeFill = (kind, seed) => {
  if (kind === "start") {
    return "#16a34a"
  }

  if (kind === "end") {
    return "#dc2626"
  }

  if (kind === "tool") {
    return "#0891b2"
  }

  return NODE_COLORS[hashValue(seed) % NODE_COLORS.length]
}

const truncateLabel = (label) => {
  if (label.length <= 20) {
    return label
  }

  return `${label.slice(0, 17)}...`
}

const transformGraphData = (graphData) => {
  if (!graphData?.nodes || !graphData?.edges) {
    return { nodes: [], edges: [] }
  }

  const nameToIdMap = new Map()
  for (const node of graphData.nodes) {
    if (node?.name && node?.id) {
      nameToIdMap.set(node.name, node.id)
    }
  }

  const nodes = graphData.nodes.map((node, index) => {
    const rawName = node?.name || `Node ${index + 1}`
    const kind = getNodeKind(rawName)

    return {
      id: String(node?.id || rawName),
      label: getNodeLabel(rawName),
      kind,
      badge: getNodeBadge(kind),
      fill: getNodeFill(kind, `${node?.id || ""}-${rawName}`),
      subtitle: kind === "node" ? "Agent node" : `${kind} node`,
    }
  })

  const edges = graphData.edges.map((edge, index) => {
    const sourceId = String(nameToIdMap.get(edge?.source) || edge?.source || "")
    const targetId = String(nameToIdMap.get(edge?.target) || edge?.target || "")

    return {
      id: String(edge?.id || `${sourceId}-${targetId}-${index}`),
      source: sourceId,
      target: targetId,
      label: `${edge?.source || sourceId} -> ${edge?.target || targetId}`,
    }
  })

  return { nodes, edges }
}

const buildGraphLayout = (nodes, edges) => {
  if (nodes.length === 0) {
    return {
      height: MIN_GRAPH_HEIGHT,
      nodes: [],
      edges: [],
      width: MIN_GRAPH_WIDTH,
    }
  }

  const orderedNodes = [...nodes].sort((left, right) =>
    left.label.localeCompare(right.label)
  )
  const nodeIds = new Set(orderedNodes.map((node) => node.id))
  const outgoing = new Map(orderedNodes.map((node) => [node.id, []]))
  const indegree = new Map(orderedNodes.map((node) => [node.id, 0]))
  const levels = new Map()

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      continue
    }

    outgoing.get(edge.source).push(edge.target)
    indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1)
  }

  const queue = orderedNodes
    .filter((node) => (indegree.get(node.id) || 0) === 0)
    .map((node) => node.id)

  for (const nodeId of queue) {
    levels.set(nodeId, 0)
  }

  let queueIndex = 0
  while (queueIndex < queue.length) {
    const currentId = queue[queueIndex]
    queueIndex += 1

    const currentLevel = levels.get(currentId) || 0

    for (const targetId of outgoing.get(currentId) || []) {
      const nextLevel = currentLevel + 1
      levels.set(targetId, Math.max(levels.get(targetId) || 0, nextLevel))

      const remaining = (indegree.get(targetId) || 0) - 1
      indegree.set(targetId, remaining)

      if (remaining === 0) {
        queue.push(targetId)
      }
    }
  }

  let fallbackLevel = Math.max(0, ...levels.values())
  for (const node of orderedNodes) {
    if (!levels.has(node.id)) {
      fallbackLevel += 1
      levels.set(node.id, fallbackLevel)
    }
  }

  const columns = new Map()
  for (const node of orderedNodes) {
    const level = levels.get(node.id) || 0
    const column = columns.get(level) || []
    column.push(node)
    columns.set(level, column)
  }

  const maxLevel = Math.max(...columns.keys())
  const maxRows = Math.max(...[...columns.values()].map((column) => column.length))
  const width = Math.max(
    MIN_GRAPH_WIDTH,
    NODE_PADDING * 2 +
      NODE_WIDTH +
      maxLevel * (NODE_WIDTH + COLUMN_GAP)
  )
  const height = Math.max(
    MIN_GRAPH_HEIGHT,
    NODE_PADDING * 2 +
      maxRows * NODE_HEIGHT +
      Math.max(0, maxRows - 1) * ROW_GAP
  )

  const positionedNodes = []
  const positions = new Map()

  for (const [level, columnNodes] of [...columns.entries()].sort(
    (left, right) => left[0] - right[0]
  )) {
    const columnHeight =
      columnNodes.length * NODE_HEIGHT +
      Math.max(0, columnNodes.length - 1) * ROW_GAP
    const startY = Math.max(NODE_PADDING, (height - columnHeight) / 2)
    const x = NODE_PADDING + level * (NODE_WIDTH + COLUMN_GAP)

    columnNodes.forEach((node, index) => {
      const y = startY + index * (NODE_HEIGHT + ROW_GAP)
      const positionedNode = {
        ...node,
        x,
        y,
      }

      positionedNodes.push(positionedNode)
      positions.set(node.id, positionedNode)
    })
  }

  const routedEdges = edges.flatMap((edge) => {
    const source = positions.get(edge.source)
    const target = positions.get(edge.target)

    if (!source || !target) {
      return []
    }

    const startX = source.x + NODE_WIDTH
    const startY = source.y + NODE_HEIGHT / 2
    const endX = target.x
    const endY = target.y + NODE_HEIGHT / 2
    const path = [
      `M ${startX} ${startY}`,
      `C ${startX + CURVE_OFFSET} ${startY},`,
      `${endX - CURVE_OFFSET} ${endY},`,
      `${endX} ${endY}`,
    ].join(" ")

    return {
      ...edge,
      path,
    }
  })

  return {
    height,
    nodes: positionedNodes,
    edges: routedEdges,
    width,
  }
}

const ReFlowComponent = ({ graphData }) => {
  const markerId = useId().replaceAll(":", "")
  const { nodes, edges } = useMemo(() => transformGraphData(graphData), [graphData])
  const graphLayout = useMemo(
    () => buildGraphLayout(nodes, edges),
    [edges, nodes]
  )

  if (nodes.length === 0) {
    return (
      <div className="flex h-full min-h-80 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
        {EMPTY_STATE}
      </div>
    )
  }

  return (
    <div
      className="h-full w-full overflow-auto rounded-lg border border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-950/40"
      data-testid="network-graph"
    >
      <div className="flex min-h-full min-w-full items-start justify-start p-4">
        <svg
          aria-label="Network graph"
          height={graphLayout.height}
          role="img"
          viewBox={`0 0 ${graphLayout.width} ${graphLayout.height}`}
          width={graphLayout.width}
        >
          <defs>
            <marker
              id={markerId}
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="7"
              refY="4"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="#94a3b8" />
            </marker>
          </defs>

          {graphLayout.edges.map((edge) => (
            <path
              key={edge.id}
              d={edge.path}
              fill="none"
              markerEnd={`url(#${markerId})`}
              opacity="0.95"
              stroke="#94a3b8"
              strokeWidth="2"
            >
              <title>{edge.label}</title>
            </path>
          ))}

          {graphLayout.nodes.map((node) => (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <title>{node.label}</title>
              <rect
                fill="rgba(15, 23, 42, 0.06)"
                height={NODE_HEIGHT}
                rx="18"
                width={NODE_WIDTH}
                x="4"
                y="4"
              />
              <rect
                fill={node.fill}
                height={NODE_HEIGHT}
                rx="18"
                width={NODE_WIDTH}
              />
              <rect
                fill="rgba(255, 255, 255, 0.18)"
                height="32"
                rx="10"
                width="32"
                x="14"
                y="16"
              />
              <text
                fill="#ffffff"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace"
                fontSize="14"
                fontWeight="700"
                textAnchor="middle"
                x="30"
                y="37"
              >
                {node.badge}
              </text>
              <text
                fill="#ffffff"
                fontFamily="system-ui, sans-serif"
                fontSize="14"
                fontWeight="700"
                x="58"
                y="28"
              >
                {truncateLabel(node.label)}
              </text>
              <text
                fill="rgba(255, 255, 255, 0.8)"
                fontFamily="system-ui, sans-serif"
                fontSize="11"
                x="58"
                y="46"
              >
                {node.subtitle}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

ReFlowComponent.propTypes = {
  graphData: PropTypes.shape({
    edges: PropTypes.arrayOf(PropTypes.object),
    nodes: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
}

export default ReFlowComponent
