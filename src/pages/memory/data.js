// Dummy memory-store data mirroring docs/mockups/memory.html.
// Fields match the real MemoryRecord / MemorySearchResult schema — do not invent extras.
// Swapped for live store API data in a later pass.

export const SCOPE = {
  userId: "u_8842",
  loaded: "128 / 128",
  total: 128,
}

export const COLLECTIONS = ["agentflow_memories", "acme_memories", "support_kb"]

// memory_type — 7 real enum values, with loaded counts
export const TYPES = [
  { k: "episodic", n: 41 },
  { k: "semantic", n: 54 },
  { k: "procedural", n: 12 },
  { k: "entity", n: 9 },
  { k: "relationship", n: 6 },
  { k: "declarative", n: 4 },
  { k: "custom", n: 2 },
]

export const CATS = [
  { k: "general", n: 60 },
  { k: "preferences", n: 22 },
  { k: "orders", n: 18 },
  { k: "health", n: 9 },
  { k: "places", n: 8 },
  { k: "support", n: 6 },
  { k: "profile", n: 5 },
]

export const RETRIEVAL_STRATEGIES = [
  "SIMILARITY",
  "TEMPORAL",
  "RELEVANCE",
  "HYBRID",
  "GRAPH_TRAVERSAL",
]

export const DISTANCE_METRICS = ["cosine", "dot_product", "euclidean", "manhattan"]

export const MEM = [
  {
    id: "mem_a71f3c2d…c04",
    type: "semantic",
    cat: "preferences",
    thread: "th_2a8f…b60",
    ts: "2026-06-18 09:41",
    score: 0.91,
    content: "User prefers oat-milk lattes with no added sugar.",
    meta: { memory_key: "drink_preference", source: "long_term_memory", confidence: 0.86 },
  },
  {
    id: "mem_38dd91a0…9b1",
    type: "episodic",
    cat: "orders",
    thread: "th_71bd…9a2",
    ts: "2026-06-12 14:03",
    score: 0.78,
    content: "Ordered a flat white at Blue Bottle on 2026-06-12.",
    meta: { source: "conversation" },
  },
  {
    id: "mem_5c9a04f2…2ff",
    type: "semantic",
    cat: "health",
    thread: "—",
    ts: "2026-04-20 11:20",
    score: 0.74,
    content: "User is lactose intolerant.",
    meta: { memory_key: "dietary_restriction", confidence: 0.94 },
  },
  {
    id: "mem_e402ab7c…7ac",
    type: "entity",
    cat: "places",
    thread: "—",
    ts: "2026-05-30 18:02",
    score: 0.55,
    content: "Favorite coffee shop: Blue Bottle, Ferry Building, SF.",
    meta: { memory_key: "favorite_cafe", entity: "Blue Bottle" },
  },
  {
    id: "mem_11c8de40…0aa",
    type: "procedural",
    cat: "support",
    thread: "—",
    ts: "2026-05-14 08:11",
    score: 0.31,
    content:
      "To reset the user password: send a reset link to the email on file, then confirm receipt.",
    meta: { memory_key: "password_reset_flow" },
  },
  {
    id: "mem_7fa2b190…3e1",
    type: "relationship",
    cat: "general",
    thread: "—",
    ts: "2026-06-01 16:44",
    score: 0.22,
    content: "User works with Marco (u_1290) on the growth team.",
    meta: { entity_a: "u_8842", entity_b: "u_1290", relation: "colleague" },
  },
  {
    id: "mem_9d31c7e8…5bd",
    type: "declarative",
    cat: "profile",
    thread: "—",
    ts: "2026-04-02 10:00",
    score: 0.18,
    content: "User's timezone is America/Los_Angeles.",
    meta: { memory_key: "timezone" },
  },
]

// Deterministic embedding-bar heights for a given memory (mirrors the mockup's sine walk).
export function embBars(type) {
  const bars = []
  for (let i = 0; i < 52; i++) {
    bars.push(18 + Math.abs(Math.sin(i * 1.7 + type.length)) * 80)
  }
  return bars
}
