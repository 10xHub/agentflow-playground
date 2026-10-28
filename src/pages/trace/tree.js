// Turns the flat span list of a run into an ordered tree of rows for the run
// tree, and answers visibility / default-selection questions about it. Only data
// from the payload is used; absent fields stay absent.

export const fmtMs = (ms) => {
  if (ms == null) return "—"
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.round(ms)}ms`
}

export const spanLabel = (span) =>
  span.kind === "node" || span.kind === "tool"
    ? span.name.replace(/^(node|tool):\s*/, "")
    : span.name

const sumOrNull = (n) => (n > 0 ? n : null)

// Tokens charged to a single llm span.
const ownTokens = (span) => {
  if (span.kind !== "llm") return 0
  if (span.total_tokens != null) return span.total_tokens
  return (span.input_tokens || 0) + (span.output_tokens || 0)
}

// Children grouped by parent id, ordered by start. A span whose parent is
// missing or unknown becomes a top-level span.
const groupByParent = (spans) => {
  const ids = new Set(spans.map((s) => s.id))
  const groups = new Map()
  for (const span of spans) {
    const key =
      span.parent && span.parent !== span.id && ids.has(span.parent)
        ? span.parent
        : null
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(span)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => (a.start_ms || 0) - (b.start_ms || 0))
  }
  return groups
}

const runWindow = (run, spans) => {
  const end = Math.max(
    0,
    ...spans.map((s) => (s.start_ms || 0) + (s.duration_ms || 0))
  )
  return Math.max(1, run.duration_ms || end)
}

const barOf = (span, total) => {
  const left = Math.min(100, Math.max(0, ((span.start_ms || 0) / total) * 100))
  const raw = ((span.duration_ms || 0) / total) * 100
  return { left, width: Math.min(100 - left, Math.max(raw, 0.8)) }
}

/**
 * Rows in depth-first order: { id, span, depth, hasChildren, label, kind,
 * status, left, width, dur, tokens }.
 */
export const buildTree = (run) => {
  const spans = run?.spans ?? []
  if (!spans.length) return { rows: [], total: 0 }
  const total = runWindow(run, spans)
  const groups = groupByParent(spans)
  const rows = []
  const seen = new Set()

  const visit = (span, depth) => {
    if (seen.has(span.id)) return 0
    seen.add(span.id)
    const row = {
      id: span.id,
      span,
      depth,
      kind: span.kind,
      label: spanLabel(span),
      status: span.status ?? null,
      dur: fmtMs(span.duration_ms),
      ...barOf(span, total),
    }
    rows.push(row)
    const kids = groups.get(span.id) ?? []
    let tokens = ownTokens(span)
    for (const kid of kids) tokens += visit(kid, depth + 1)
    row.hasChildren = kids.length > 0
    row.tokens = sumOrNull(tokens)
    return tokens
  }

  for (const top of groups.get(null) ?? []) visit(top, 0)
  const root = rows.find((r) => r.kind === "root")
  const usage = run.usage?.total_tokens
  if (root && usage) root.tokens = usage
  return { rows, total }
}

/** Rows not hidden by a collapsed ancestor. */
export const visibleRows = (rows, collapsed) => {
  const out = []
  let hideBelow = null
  for (const row of rows) {
    if (hideBelow !== null && row.depth > hideBelow) continue
    hideBelow = null
    out.push(row)
    if (collapsed.has(row.id) && row.hasChildren) hideBelow = row.depth
  }
  return out
}

/** Ids that have children, for "collapse all". */
export const expandableIds = (rows) =>
  rows.filter((r) => r.hasChildren).map((r) => r.id)

/** The span to show first: the first non-root error, else the last llm call, else the top. */
export const defaultRow = (rows) => {
  if (!rows.length) return null
  return (
    rows.find((r) => r.status === "error" && r.kind !== "root") ??
    [...rows].reverse().find((r) => r.kind === "llm") ??
    rows[0]
  )
}

/** Evenly spaced ticks across the run window. */
export const rulerFor = (total) =>
  Array.from({ length: 5 }, (_, i) => ({
    id: i,
    at: (total * i) / 4,
    label: fmtMs((total * i) / 4),
  }))
