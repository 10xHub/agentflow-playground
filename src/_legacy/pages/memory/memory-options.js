import {
  MemoryType,
  RetrievalStrategy,
  DistanceMetric,
} from "@10xscale/agentflow-client"

const toOptions = (enumObject) =>
  Object.values(enumObject).map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " "),
  }))

export const MEMORY_TYPE_OPTIONS = toOptions(MemoryType)
export const RETRIEVAL_STRATEGY_OPTIONS = toOptions(RetrievalStrategy)
export const DISTANCE_METRIC_OPTIONS = toOptions(DistanceMetric)

export const DEFAULT_MEMORY_TYPE = MemoryType.EPISODIC
