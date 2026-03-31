import PropTypes from "prop-types"
import { Canvas, Node, Icon, Label } from "reaflow"

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

/**
 * ReagraphComponent - Lightweight graph visualization using Reagraph
 * @param {object} props - Component props
 * @param {object} props.graphData - Graph data to visualize
 * @param {string} props.theme - Current theme (light/dark)
 * @returns {object} Reagraph canvas component
 */
const ReFlowComponent = ({ graphData }) => {
  const { nodes, edges } = _transformToReagraphFormat(graphData)

  return (
    <div className="w-full h-full border rounded-lg dark:border-slate-700">
      <Canvas
        readonly
        nodes={nodes}
        edges={edges}
        fit
        panType="drag"
        node={(node) => {
          return (
            <Node
              icon={<Icon />}
              style={{
                stroke: node.properties.fill,
                fill: node.properties.fill,
                strokeWidth: 1,
              }}
              label={<Label style={{ fill: "White" }} />}
            />
          )
        }}
      />
    </div>
  )
}

ReFlowComponent.propTypes = {
  graphData: PropTypes.object.isRequired,
  theme: PropTypes.string.isRequired,
}

export default ReFlowComponent
