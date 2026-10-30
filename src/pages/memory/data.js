// Fixed option lists for the memory screen. Memories themselves come from the store API.

export const MEMORY_TYPES = [
  "episodic",
  "semantic",
  "procedural",
  "entity",
  "relationship",
  "declarative",
  "custom",
]

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
