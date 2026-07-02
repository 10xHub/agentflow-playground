// Maps the API observability payload (run: { spans, events, usage, ... }) into
// the exact view-model shapes the observability components render.

const nf = new Intl.NumberFormat("en-US")

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
function indentFor(span, byId) {
  let depth = 0
  let cur = span
  const seen = new Set()
  while (cur?.parent && byId[cur.parent] && !seen.has(cur.parent)) {
    seen.add(cur.parent)
    depth += 1
    cur = byId[cur.parent]
  }
  if (depth <= 0) return ""
  return `${"  ".repeat(depth - 1)}└`
}

export function buildViewModel(run) {
  if (!run) {
    return { spans: [], events: [], ruler: [], stats: [], cost: null }
  }

  const total = Math.max(1, run.duration_ms || 0)
  const byId = {}
  for (const s of run.spans || []) byId[s.id] = s

  // Spans -> waterfall rows. left/width as % of the run window; give zero-length
  // spans a small minimum so they remain visible/clickable.
  const spans = (run.spans || []).map((s) => {
    const left = Math.min(100, Math.max(0, (s.start_ms / total) * 100))
    const rawW = (s.duration_ms / total) * 100
    const width = Math.min(100 - left, Math.max(rawW, 1.5))
    return {
      id: s.id,
      kind: s.kind,
      name:
        s.kind === "root"
          ? s.name
          : s.kind === "node"
            ? s.name
            : `${s.kind}: ${s.name}`,
      label: s.name.replace(/^\w+:\s*/, ""),
      indent: indentFor(s, byId),
      left,
      width,
      dur: fmtMs(s.duration_ms),
      spanId: s.id,
      parent: s.parent || "—",
      // llm-only fields the DetailPanel reads to show GenAI semconv.
      ...(s.kind === "llm"
        ? {
            model: s.model || "—",
            in: s.input_tokens || 0,
            out: s.output_tokens || 0,
          }
        : {}),
    }
  })

  // Events -> pane rows.
  const events = (run.events || []).map((e) => ({
    id: e.id,
    time: `+${((e.offset_ms || 0) / 1000).toFixed(2)}s`,
    type: e.type,
    node: e.node || "—",
    summary: e.summary,
  }))

  // Ruler ticks across the window.
  const ticks = 4
  const ruler = Array.from({ length: ticks + 1 }, (_, i) =>
    fmtMs((total * i) / ticks)
  )

  const usage = run.usage || {}
  const stats = [
    { label: "duration", value: (total / 1000).toFixed(2), small: "s" },
    { label: "tokens", value: nf.format(usage.total_tokens || 0) },
    { label: "est. cost", value: estCost(usage), accent: true },
    { label: "iterations", value: String(run.iterations ?? 0) },
    { label: "tool calls", value: String(run.tool_calls ?? 0) },
    { label: "spans", value: String((run.spans || []).length) },
  ]

  const cost = buildCost(run, usage)

  return { spans, events, ruler, stats, cost }
}

function pct(part, whole) {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}

function buildCost(run, usage) {
  const total = usage.total_tokens || 0
  const cards = [
    { label: "total tokens", value: nf.format(total) },
    { label: "est. cost", value: estCost(usage), accent: true },
    { label: "llm calls", value: String(run.llm_calls ?? 0) },
    { label: "tool calls", value: String(run.tool_calls ?? 0) },
  ]

  const breakdown = [
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

  // Per-node token/call table from spans.
  const nodeAgg = {}
  for (const s of run.spans || []) {
    if (s.kind === "node") {
      nodeAgg[s.name] = nodeAgg[s.name] || { tokens: 0, calls: 0 }
    }
    if (s.kind === "llm") {
      const parent = (run.spans || []).find((p) => p.id === s.parent)
      const key = parent?.name || "—"
      nodeAgg[key] = nodeAgg[key] || { tokens: 0, calls: 0 }
      nodeAgg[key].tokens += (s.input_tokens || 0) + (s.output_tokens || 0)
      nodeAgg[key].calls += 1
    }
    if (s.kind === "tool") {
      const parent = (run.spans || []).find((p) => p.id === s.parent)
      const key = parent?.name || "—"
      nodeAgg[key] = nodeAgg[key] || { tokens: 0, calls: 0 }
      nodeAgg[key].calls += 1
    }
  }

  const byNode = {
    head: ["node", "tokens", "calls"],
    rows: Object.entries(nodeAgg).map(([name, v]) => [
      name.replace(/^node:\s*/, ""),
      v.tokens ? nf.format(v.tokens) : "—",
      String(v.calls),
    ]),
  }

  const byModel = {
    head: ["model", "tokens", "cost"],
    rows: (() => {
      const models = {}
      for (const s of run.spans || []) {
        if (s.kind === "llm" && s.model) {
          models[s.model] = (models[s.model] || 0) + (s.input_tokens || 0) + (s.output_tokens || 0)
        }
      }
      const entries = Object.entries(models)
      if (!entries.length) return [["—", nf.format(total), estCost(usage)]]
      return entries.map(([m, tok]) => [m, nf.format(tok), estCost(usage)])
    })(),
  }

  return { cards, breakdown, byModel, byNode }
}
