// Maps the API observability payload (run: { spans, events, usage, ... }) into
// the exact view-model shapes the observability components render.

const nf = new Intl.NumberFormat("en-US")

const TOOL_CALLS_LABEL = "tool calls"

// Rough cost estimate (USD). Without per-model pricing from the backend we use a
// small blended rate so the number is indicative, not authoritative.
const RATE_PER_1K = { prompt: 0.00015, completion: 0.0006 }
const estCost = (usage) => {
  const p = (usage.prompt_tokens || 0) / 1000
  const c = (usage.completion_tokens || 0) / 1000
  const v = p * RATE_PER_1K.prompt + c * RATE_PER_1K.completion
  return `$${v.toFixed(4)}`
}

// An event -> pane row.
/**
 *
 */
const toEventRow = (e) => ({
  id: e.id,
  time: `+${((e.offset_ms || 0) / 1000).toFixed(2)}s`,
  type: e.type,
  node: e.node || "—",
  summary: e.summary,
})

/**
 *
 */
const buildStats = (run, usage, total) => [
  { label: "status", value: run.status || "—" },
  { label: "duration", value: (total / 1000).toFixed(2), small: "s" },
  { label: "tokens", value: nf.format(usage.total_tokens || 0) },
  {
    label: "est. cost",
    value: estCost(usage),
    accent: true,
    hint: "Rough estimate from token counts at a blended rate. The API reports tokens only, not dollars.",
  },
  {
    label: "node visits",
    value: String(run.iterations ?? 0),
    hint: "How many times a node ran in this run. A loop counts each pass.",
  },
  { label: TOOL_CALLS_LABEL, value: String(run.tool_calls ?? 0) },
  {
    label: "spans",
    value: String((run.spans || []).length),
    hint: "Timed steps in the tree: the run, node visits, LLM calls and tool calls.",
  },
]

export const buildViewModel = (run) => {
  if (!run) return { events: [], stats: [], cost: null }
  const total = Math.max(1, run.duration_ms || 0)
  const usage = run.usage || {}
  return {
    events: (run.events || []).map((e) => toEventRow(e)),
    stats: buildStats(run, usage, total),
    cost: buildCost(run, usage),
  }
}

/**
 *
 */
const pct = (part, whole) => {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}

/**
 *
 */
const tokenBreakdown = (usage, total) => [
  {
    key: "prompt",
    value: nf.format(usage.prompt_tokens || 0),
    pct: pct(usage.prompt_tokens || 0, total),
    variant: "node",
  },
  {
    key: "completion",
    value: nf.format(usage.completion_tokens || 0),
    pct: pct(usage.completion_tokens || 0, total),
    variant: "llm",
  },
  {
    key: "reasoning",
    value: nf.format(usage.reasoning_tokens || 0),
    pct: pct(usage.reasoning_tokens || 0, total),
    variant: "tool",
  },
]

/**
 *
 */
const bucketFor = (agg, key) => {
  agg[key] = agg[key] || { tokens: 0, calls: 0 }
  return agg[key]
}

// Name of the span's parent, which is the node a llm/tool span is charged to.
/**
 *
 */
const parentName = (run, span) => {
  const parent = (run.spans || []).find((p) => p.id === span.parent)
  return parent?.name || "—"
}

// Per-node token/call aggregation from spans.
/**
 *
 */
const aggregateByNode = (run) => {
  const agg = {}
  for (const s of run.spans || []) {
    if (s.kind === "node") bucketFor(agg, s.name)
    if (s.kind === "llm") {
      const bucket = bucketFor(agg, parentName(run, s))
      bucket.tokens += (s.input_tokens || 0) + (s.output_tokens || 0)
      bucket.calls += 1
    }
    if (s.kind === "tool") bucketFor(agg, parentName(run, s)).calls += 1
  }
  return agg
}

// Per-model token totals from llm spans; falls back to one blended row.
/**
 *
 */
const modelRows = (run, usage, total) => {
  const models = {}
  for (const s of run.spans || []) {
    if (s.kind === "llm" && s.model) {
      const m = (models[s.model] = models[s.model] || { in: 0, out: 0 })
      m.in += s.input_tokens || 0
      m.out += s.output_tokens || 0
    }
  }
  const entries = Object.entries(models)
  if (!entries.length) return [["—", nf.format(total), estCost(usage)]]
  return entries.map(([name, m]) => [
    name,
    nf.format(m.in + m.out),
    estCost({ prompt_tokens: m.in, completion_tokens: m.out }),
  ])
}

/**
 *
 */
const buildCost = (run, usage) => {
  const total = usage.total_tokens || 0
  const cards = [
    { label: "total tokens", value: nf.format(total) },
    { label: "est. cost", value: estCost(usage), accent: true },
    { label: "llm calls", value: String(run.llm_calls ?? 0) },
    { label: TOOL_CALLS_LABEL, value: String(run.tool_calls ?? 0) },
  ]

  const breakdown = tokenBreakdown(usage, total)

  const byNode = {
    head: ["node", "tokens", "calls"],
    rows: Object.entries(aggregateByNode(run)).map(([name, v]) => [
      name.replace(/^node:\s*/, ""),
      v.tokens ? nf.format(v.tokens) : "—",
      String(v.calls),
    ]),
  }

  const byModel = {
    head: ["model", "tokens", "cost"],
    rows: modelRows(run, usage, total),
  }

  return { cards, breakdown, byModel, byNode }
}
