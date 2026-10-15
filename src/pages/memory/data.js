// Fixed option lists for the memory screen. Memories themselves come from the store API.

// Matches DEFAULT_COLLECTION in the core QdrantStore/Mem0Store (tenxgraph.storage.store),
// which still uses the pre-rename name. Change both together, or this points at an empty collection.
export const DEFAULT_COLLECTION = "agentflow_memories"

export const COLLECTIONS = [DEFAULT_COLLECTION]

export const RETRIEVAL_STRATEGIES = [
  "SIMILARITY",
  "TEMPORAL",
  "RELEVANCE",
  "HYBRID",
  "GRAPH_TRAVERSAL",
]

export const DISTANCE_METRICS = [
  "cosine",
  "dot_product",
  "euclidean",
  "manhattan",
]
