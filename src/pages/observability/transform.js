// Maps the API observability payload (run: { spans, events, usage, ... }) into
// the exact view-model shapes the observability components render.

const nf = new Intl.NumberFormat("en-US")

const TOOL_CALLS_LABEL = "tool calls"

const fmtMs = (ms) => {
  if (ms == null) return "—"
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.round(ms)}ms`
}

// Rough cost estimate (USD). Without per-model pricing from the backend we use a
// small blended rate so the number is indicative, not authoritative.
const RATE_PER_1K = { prompt: 0.00015, completion: 0.0006 }
const estCost = (usage) => {
  const p = (usage.prompt_tokens || 0) / 1000
  const c = (usage.completion_tokens || 0) / 1000
  const v = p * RATE_PER_1K.prompt + c * RATE_PER_1K.completion
  return `$${v.toFixed(4)}`
}

// Depth of a span from the root, for the tree indent glyph.
/**
 *
 */
const indentFor = (span, byId) => {
  let depth = 0
  let current = span
  const seen = new Set()
  while (current?.parent && byId[current.parent] && !seen.has(current.parent)) {
    seen.add(current.parent)
    depth += 1
    current = byId[current.parent]
  }
  if (depth <= 0) return ""
  return `${"  ".repeat(depth - 1)}└`
}

// Display name: root/node spans keep their own name, everything else is prefixed
// with its kind.
/**
 *
 */
const spanName = (s) =>
  s.kind === "root" || s.kind === "node" ? s.name : `${s.kind}: ${s.name}`

// llm-only fields the DetailPanel reads to show GenAI semconv.
/**
 *
 */
const llmFields = (s) =>
  s.kind === "llm"
    ? {
        model: s.model || "—",
        in: s.input_tokens || 0,
        out: s.output_tokens || 0,
      }
    : {}

// A span -> waterfall row. left/width as % of the run window; give zero-length
// spans a small minimum so they remain visible/clickable.
/**
 *
 */
const toSpanRow = (s, total, byId) => {
  const left = Math.min(100, Math.max(0, (s.start_ms / total) * 100))
  const rawW = (s.duration_ms / total) * 100
  const width = Math.min(100 - left, Math.max(rawW, 1.5))
  return {
    id: s.id,
    kind: s.kind,
    name: spanName(s),
    label: s.name.replace(/^\w+:\s*/, ""),
    indent: indentFor(s, byId),
    left,
    width,
    dur: fmtMs(s.duration_ms),
    spanId: s.id,
    parent: s.parent || "—",
    ...llmFields(s),
  }
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
  { label: "duration", value: (total / 1000).toFixed(2), small: "s" },
  { label: "tokens", value: nf.format(usage.total_tokens || 0) },
  { label: "est. cost", value: estCost(usage), accent: true },
  { label: "iterations", value: String(run.iterations ?? 0) },
  { label: TOOL_CALLS_LABEL, value: String(run.tool_calls ?? 0) },
  { label: "spans", value: String((run.spans || []).length) },
]

// Ruler ticks across the window. `at` is the exact offset in ms, unique per
// tick, and doubles as the React key for the label row.
/**
 *
 */
const buildRuler = (total) => {
  const ticks = 4
  return Array.from({ length: ticks + 1 }, (_, index) => {
    const at = (total * index) / ticks
    return { at, label: fmtMs(at) }
  })
}

/**
 *
 */
export const buildViewModel = (run) => {
  if (!run) {
    return { spans: [], events: [], ruler: [], stats: [], cost: null }
  }

  const total = Math.max(1, run.duration_ms || 0)
  const byId = {}
  for (const s of run.spans || []) byId[s.id] = s

  const spans = (run.spans || []).map((s) => toSpanRow(s, total, byId))
  const events = (run.events || []).map((e) => toEventRow(e))
  const ruler = buildRuler(total)

  const usage = run.usage || {}
  const stats = buildStats(run, usage, total)
  const cost = buildCost(run, usage)

  return { spans, events, ruler, stats, cost }
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
      models[s.model] =
        (models[s.model] || 0) + (s.input_tokens || 0) + (s.output_tokens || 0)
    }
  }
  const entries = Object.entries(models)
  if (!entries.length) return [["—", nf.format(total), estCost(usage)]]
  return entries.map(([m, tok]) => [m, nf.format(tok), estCost(usage)])
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
