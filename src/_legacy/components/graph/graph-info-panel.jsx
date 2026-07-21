import { Info, GitBranch, Link, Database, Shield } from "lucide-react"
import PropTypes from "prop-types"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Color constants
const SUCCESS_COLOR = "text-green-600 dark:text-green-400"
const INACTIVE_COLOR = "text-gray-500 dark:text-gray-400"

/**
 * Stats display component
 */
const StatsSection = ({ nodeCount, edgeCount }) => {
  const stats = [
    {
      icon: GitBranch,
      label: "Nodes",
      value: nodeCount,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      icon: Link,
      label: "Edges",
      value: edgeCount,
      color: SUCCESS_COLOR,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => {
        const IconComponent = stat.icon
        return (
          <div key={stat.label} className="text-center">
            <div
              className={`flex items-center justify-center mb-1 ${stat.color}`}
            >
              <IconComponent className="w-4 h-4 mr-1" />
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Features display component
 */
const FeaturesSection = ({
  checkpointer,
  checkpointerType,
  publisher,
  store,
}) => {
  const features = [
    {
      icon: Database,
      label: "Checkpointer",
      value: checkpointer,
      type: checkpointerType,
      color: checkpointer ? SUCCESS_COLOR : INACTIVE_COLOR,
    },
    {
      icon: Shield,
      label: "Publisher",
      value: publisher,
      color: publisher ? SUCCESS_COLOR : INACTIVE_COLOR,
    },
    {
      icon: Info,
      label: "Store",
      value: store,
      color: store ? SUCCESS_COLOR : INACTIVE_COLOR,
    },
  ]

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Features</h4>
      {features.map((feature) => {
        const IconComponent = feature.icon
        return (
          <div
            key={feature.label}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <IconComponent className={`w-4 h-4 ${feature.color}`} />
              <span className="text-sm">
                {feature.label}{" "}
                {feature.type && feature.value && (
                  <span className="text-xs text-muted-foreground">
                    ({feature.type})
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-xs font-medium ${feature.color}`}>
                {feature.value ? "✓" : "✗"}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Interrupts display component
 */
const InterruptsSection = ({ interruptBefore, interruptAfter }) => {
  const hasInterrupts = interruptBefore.length > 0 || interruptAfter.length > 0

  if (!hasInterrupts) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Interrupts</h4>
      {interruptBefore.length > 0 && (
        <div className="text-xs">
          <span className="font-medium">Before:</span>{" "}
          {interruptBefore.join(", ")}
        </div>
      )}
      {interruptAfter.length > 0 && (
        <div className="text-xs">
          <span className="font-medium">After:</span>{" "}
          {interruptAfter.join(", ")}
        </div>
      )}
    </div>
  )
}

/**
 * State & Identity display component
 */
const StateIdentitySection = ({
  contextType,
  idGenerator,
  idType,
  stateType,
  stateFields,
}) => {
  const hasData =
    [contextType, idGenerator, idType, stateType].some(
      (field) => field && field !== "none"
    ) || stateFields.length > 0

  if (!hasData) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">
        State & Identity
      </h4>
      {contextType && contextType !== "none" && (
        <div className="text-xs">
          <span className="font-medium">Context Type:</span> {contextType}
        </div>
      )}
      {stateType && (
        <div className="text-xs">
          <span className="font-medium">State Type:</span> {stateType}
        </div>
      )}
      {stateFields.length > 0 && (
        <div className="text-xs">
          <span className="font-medium">State Fields:</span>{" "}
          {stateFields.join(", ")}
        </div>
      )}
      {idGenerator && (
        <div className="text-xs">
          <span className="font-medium">ID Generator:</span> {idGenerator} :
          Type-{idType}
        </div>
      )}
    </div>
  )
}

/**
 * Helper function to extract graph data with defaults
 * @param {object} graphInfo - Raw graph info
 * @returns {object} Processed graph data
 */
/* eslint-disable complexity */
const processGraphData = (graphInfo) => ({
  node_count: graphInfo.node_count || 0,
  edge_count: graphInfo.edge_count || 0,
  checkpointer: graphInfo.checkpointer || false,
  checkpointer_type: graphInfo.checkpointer_type || "None",
  publisher: graphInfo.publisher || false,
  store: graphInfo.store || false,
  interrupt_before: graphInfo.interrupt_before || [],
  interrupt_after: graphInfo.interrupt_after || [],
  context_type: graphInfo.context_type || "none",
  id_generator: graphInfo.id_generator || "",
  id_type: graphInfo.id_type || "",
  state_type: graphInfo.state_type || "",
  state_fields: graphInfo.state_fields || [],
})
/* eslint-enable complexity */

/**
 * Graph Info Panel component displaying metadata about the graph
 * @param {object} props - Component props
 * @param {object} props.graphInfo - Graph metadata information
 * @returns {object} React component displaying graph information
 */
export const GraphInfoPanel = ({ graphInfo }) => {
  const {
    node_count,
    edge_count,
    checkpointer,
    checkpointer_type,
    publisher,
    store,
    interrupt_before,
    interrupt_after,
    context_type,
    id_generator,
    id_type,
    state_type,
    state_fields,
  } = processGraphData(graphInfo)

  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Info className="w-5 h-5" />
          Graph Info
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <StatsSection nodeCount={node_count} edgeCount={edge_count} />

        <FeaturesSection
          checkpointer={checkpointer}
          checkpointerType={checkpointer_type}
          publisher={publisher}
          store={store}
        />

        <InterruptsSection
          interruptBefore={interrupt_before}
          interruptAfter={interrupt_after}
        />

        <StateIdentitySection
          contextType={context_type}
          idGenerator={id_generator}
          idType={id_type}
          stateType={state_type}
          stateFields={state_fields}
        />
      </CardContent>
    </Card>
  )
}

// PropTypes for sub-components
StatsSection.propTypes = {
  nodeCount: PropTypes.number.isRequired,
  edgeCount: PropTypes.number.isRequired,
}

FeaturesSection.propTypes = {
  checkpointer: PropTypes.bool.isRequired,
  checkpointerType: PropTypes.string.isRequired,
  publisher: PropTypes.bool.isRequired,
  store: PropTypes.bool.isRequired,
}

InterruptsSection.propTypes = {
  interruptBefore: PropTypes.array.isRequired,
  interruptAfter: PropTypes.array.isRequired,
}

StateIdentitySection.propTypes = {
  contextType: PropTypes.string.isRequired,
  idGenerator: PropTypes.string.isRequired,
  idType: PropTypes.string.isRequired,
  stateType: PropTypes.string.isRequired,
  stateFields: PropTypes.array.isRequired,
}

GraphInfoPanel.propTypes = {
  graphInfo: PropTypes.shape({
    node_count: PropTypes.number,
    edge_count: PropTypes.number,
    checkpointer: PropTypes.bool,
    checkpointer_type: PropTypes.string,
    publisher: PropTypes.bool,
    store: PropTypes.bool,
    interrupt_before: PropTypes.array,
    interrupt_after: PropTypes.array,
    context_type: PropTypes.string,
    id_generator: PropTypes.string,
    id_type: PropTypes.string,
    state_type: PropTypes.string,
    state_fields: PropTypes.array,
  }).isRequired,
}

export default GraphInfoPanel
