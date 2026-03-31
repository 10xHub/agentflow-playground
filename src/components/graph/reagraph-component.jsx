import PropTypes from "prop-types"
import { useMemo } from "react"
import { GraphCanvas, lightTheme, darkTheme } from "reagraph"

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
    if (isStart) {
      name = "Start"
    } else if (isEnd) {
      name = "End"
    }

    return {
      id: node.id,
      label: name,
      fill,
      size: isStart || isEnd ? 6 : 6, // Make start/end nodes larger
    }
  })

  // Transform edges for Reagraph
  const edges = _graphData.edges.map((edge) => {
    const sourceId = nameToIdMap.get(edge.source) || edge.source
    const targetId = nameToIdMap.get(edge.target) || edge.target

    return {
      id: edge.id,
      source: sourceId,
      target: targetId,
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
const ReagraphComponent = ({ graphData, theme }) => {
  // Simple test data to verify Reagraph works
  const testNodes = [
    { id: "1", label: "Start", fill: "#10b981" },
    { id: "2", label: "Main", fill: "#3b82f6" },
    { id: "3", label: "Tool", fill: "#8b5cf6" },
    { id: "4", label: "End", fill: "#ef4444" },
  ]

  const testEdges = [
    { id: "1-2", source: "1", target: "2" },
    { id: "2-3", source: "2", target: "3" },
    { id: "3-2", source: "3", target: "2" },
    { id: "2-4", source: "2", target: "4" },
  ]

  const { nodes, edges } = _transformToReagraphFormat(graphData)

  // Select proper theme object based on theme string
  const themeObject = useMemo(() => {
    return theme === "dark" ? darkTheme : lightTheme
  }, [theme])

  return (
    <div className="w-full h-full border rounded-lg dark:border-slate-700">
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        theme={themeObject}
        aggregateEdges
        // renderNode={({ size, color, opacity }) => (
        //   <group>
        //     <mesh>
        //       <torusKnotGeometry attach="geometry" args={[size, 1.25, 50, 8]} />
        //       <meshBasicMaterial
        //         attach="material"
        //         color={color}
        //         opacity={opacity}
        //         transparent
        //       />
        //     </mesh>
        //   </group>
        // )}
      />
    </div>
  )
}

ReagraphComponent.propTypes = {
  graphData: PropTypes.object.isRequired,
  theme: PropTypes.string.isRequired,
}

export default ReagraphComponent
