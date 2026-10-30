// Turns the JSON files written by `10xgraph eval` (core's JSONReporter, the
// serialized EvalReport) into the run rows, drilldowns and case views the Evals
// page renders. Pure: no network, no store.
//
// The report holds results only: no run number, no dollar cost and no
// comparison between runs. Those are derived here. "Expected" comes from each
// result's `expected` object, or for older reports from the details the
// built-in criteria record, and a run's regression is computed
// against the previous loaded report of the same eval set.

const NONE = "-"
const DEFAULT_THRESHOLD = 80
const FLAT_EPSILON = 0.005
const TOKENS_PER_KILO = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24

const round = (value, digits) => {
  const k = 10 ** digits
  return Math.round(value * k) / k
}

const sum = (values) => values.reduce((a, b) => a + b, 0)
const mean = (values) => (values.length ? sum(values) / values.length : 0)

const formatDuration = (seconds) => `${Number(seconds || 0).toFixed(1)}s`

const formatTokens = (usage) => {
  const total = usage?.total_tokens ?? 0
  if (total >= TOKENS_PER_KILO) {
    return `${(total / TOKENS_PER_KILO).toFixed(1)}k tok`
  }
  return `${total} tok`
}

export const formatAgo = (timestamp, now) => {
  const seconds = Math.max(0, now - timestamp)
  if (seconds < SECONDS_PER_MINUTE) return "just now"
  const minutes = seconds / SECONDS_PER_MINUTE
  if (minutes < MINUTES_PER_HOUR) return `${Math.floor(minutes)}m ago`
  const hours = minutes / MINUTES_PER_HOUR
  if (hours < HOURS_PER_DAY) return `${Math.floor(hours)}h ago`
  return `${Math.floor(hours / HOURS_PER_DAY)}d ago`
}

const formatStamp = (timestamp) =>
  new Date(timestamp * 1000).toISOString().slice(0, 16).replace("T", " ")

const caseType = (c) => (c.metadata && "turns" in c.metadata ? "sim" : "eval")

const caseScore = (c) => {
  const criteria = c.criterion_results || []
  if (!criteria.length) return c.passed ? 1 : 0
  return mean(criteria.map((cr) => cr.score ?? 0))
}

const caseStatus = (c) => {
  if (c.error != null) return "error"
  return c.passed ? "pass" : "fail"
}

const textOf = (content) => {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content
    .filter((b) => b && b.type === "text")
    .map((b) => b.text || "")
    .join(" ")
}

const caseInput = (c) => {
  for (const message of c.messages || []) {
    if (message.role !== "user") continue
    const text = textOf(message.content)
    if (text) return text
  }
  return NONE
}

const turnOf = (line) => {
  if (line.startsWith("USER:")) {
    return { role: "sim", text: line.slice("USER:".length).trim() }
  }
  const text = line.startsWith("AGENT:") ? line.slice("AGENT:".length) : line
  return { role: "agent", text: text.trim() }
}

const caseConversation = (c) => {
  if (caseType(c) !== "sim") return null
  const turns = (c.actual_response || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(turnOf)
  return turns.length ? turns : null
}

const caseRubric = (c) => {
  const criteria = c.criterion_results || []
  if (!criteria.length) return null
  const rows = criteria.map((cr) => ({
    key: cr.criterion || "",
    value: round(cr.score ?? 0, 2),
    tone: cr.passed ? "accent" : "danger",
    kind: "criterion",
    passed: Boolean(cr.passed),
    threshold: cr.threshold ?? null,
    details: cr.details && Object.keys(cr.details).length ? cr.details : null,
    error: cr.error ?? null,
  }))
  rows.push({
    key: "weighted score",
    value: round(caseScore(c), 2),
    tone: c.passed ? "accent" : "danger",
    kind: "summary",
    passed: null,
    threshold: null,
    details: null,
    error: null,
  })
  return rows
}

const first = (values) => values.find(Boolean) ?? null

const expectedTrajectory = (details) => {
  const named = details.find((d) => d.expected_trajectory?.length)
  if (named) return named.expected_trajectory
  const names = details.find((d) => d.expected_names?.length)
  return names ? names.expected_names.map((name) => ({ name })) : null
}

// Preferred source: the `expected` object core writes on each result.
const reportedExpected = (expected) => {
  const toolCalls = expected.tool_calls?.length ? expected.tool_calls : null
  const nodeOrder = expected.node_order?.length ? expected.node_order : null
  const response = expected.response || null
  if (!response && !toolCalls && !nodeOrder) return null
  return { response, tool_trajectory: toolCalls, node_order: nodeOrder }
}

// Older reports: expectations recorded in criterion details.
const detailExpected = (c) => {
  const details = (c.criterion_results || []).map((cr) => cr.details || {})
  const response = first(details.map((d) => d.expected_response))
  const trajectory = expectedTrajectory(details)
  const nodeOrder = first(
    details.map((d) =>
      d.expected_node_order?.length ? d.expected_node_order : null
    )
  )
  if (!response && !trajectory && !nodeOrder) return null
  return { response, tool_trajectory: trajectory, node_order: nodeOrder }
}

const caseExpected = (c) => {
  if (c.expected && typeof c.expected === "object") {
    const reported = reportedExpected(c.expected)
    if (reported) return reported
  }
  return detailExpected(c)
}

const toolSummary = (t) =>
  t.args && Object.keys(t.args).length
    ? `${t.name ?? ""}(${JSON.stringify(t.args)})`
    : String(t.name ?? "")

const expectedSummary = (expected) => {
  if (!expected) return NONE
  const parts = []
  if (expected.response) parts.push(String(expected.response))
  if (expected.tool_trajectory) {
    parts.push(`tools: ${expected.tool_trajectory.map(toolSummary).join(", ")}`)
  }
  if (expected.node_order) {
    parts.push(`nodes: ${expected.node_order.join(" > ")}`)
  }
  return parts.join("; ")
}

const reportedInput = (c) =>
  typeof c.expected?.input === "string" && c.expected.input
    ? c.expected.input
    : NONE

const buildCase = (c) => {
  const expected = caseExpected(c)
  const input = caseInput(c)
  return {
    id: c.eval_id || "",
    name: c.name || c.eval_id || "",
    type: caseType(c),
    score: round(caseScore(c), 2),
    status: caseStatus(c),
    error: c.error ?? null,
    lat: formatDuration(c.duration_seconds),
    cost: formatTokens(c.token_usage),
    input: input === NONE ? reportedInput(c) : input,
    expected: expectedSummary(expected),
    expected_detail: expected,
    expected_label: caseType(c) === "sim" ? "goals" : "response",
    actual: c.actual_response || NONE,
    rubric: caseRubric(c),
    conversation: caseConversation(c),
  }
}

const runStatus = (report) =>
  (report.summary.pass_rate ?? 0) >= 1 ? "pass" : "fail"

const deriveThreshold = (report) => {
  const thresholds = report.results.flatMap((c) =>
    (c.criterion_results || []).map((cr) => cr.threshold ?? 0)
  )
  if (!thresholds.length) return DEFAULT_THRESHOLD
  return Math.round(100 * mean(thresholds))
}

const buildStats = (report) => {
  const s = report.summary
  const avgScore = mean(report.results.map(caseScore))
  const errors = s.error_cases ?? 0
  return [
    { label: "cases", value: String(s.total_cases ?? 0) },
    { label: "passed", value: String(s.passed_cases ?? 0), tone: "ok" },
    { label: "failed", value: String(s.failed_cases ?? 0), tone: "bad" },
    {
      label: "errors",
      value: String(errors),
      ...(errors ? { tone: "bad" } : {}),
    },
    { label: "avg score", value: avgScore.toFixed(2) },
    { label: "avg latency", value: formatDuration(s.avg_duration_seconds) },
    { label: "total tokens", value: formatTokens(s.total_token_usage) },
  ]
}

const flipLabel = (prev, cur) => {
  if (prev === cur) return `${cur} (same)`
  return `${prev} → ${cur}`
}

const deltaLabel = (prev, cur) => {
  const delta = cur - prev
  const base = `${prev.toFixed(2)} → ${cur.toFixed(2)}`
  if (Math.abs(delta) < FLAT_EPSILON) {
    return { dir: "flat", delta: `${base}  -` }
  }
  if (delta > 0) return { dir: "up", delta: `${base}  ▲${delta.toFixed(2)}` }
  return { dir: "down", delta: `${base}  ▼${Math.abs(delta).toFixed(2)}` }
}

const regressionRows = (current, previous) => {
  const prevById = new Map(previous.results.map((c) => [c.eval_id, c]))
  const rows = []
  let newlyFailing = 0
  let newlyPassing = 0
  for (const cur of current.results) {
    const prev = prevById.get(cur.eval_id)
    if (!prev) continue
    const curStatus = caseStatus(cur)
    const prevStatus = caseStatus(prev)
    if (prevStatus === "pass" && curStatus !== "pass") newlyFailing += 1
    if (prevStatus !== "pass" && curStatus === "pass") newlyPassing += 1
    rows.push({
      name: cur.name || cur.eval_id,
      ...deltaLabel(caseScore(prev), caseScore(cur)),
      flip: flipLabel(prevStatus, curStatus),
      stay: curStatus === prevStatus,
    })
  }
  return { rows, newlyFailing, newlyPassing }
}

const buildRegression = (current, curLabel, previous, prevLabel) => {
  const { rows, newlyFailing, newlyPassing } = regressionRows(current, previous)
  const curRate = (current.summary.pass_rate ?? 0) * 100
  const prevRate = (previous.summary.pass_rate ?? 0) * 100
  const rateDrift = curRate - prevRate
  const scoreDrift =
    mean(current.results.map(caseScore)) - mean(previous.results.map(caseScore))
  return {
    note: {
      current: `run ${curLabel} (${curRate.toFixed(1)}%)`,
      prev: `run ${prevLabel} (${prevRate.toFixed(1)}%)`,
      suite: "same suite",
    },
    summary: [
      {
        label: "pass-rate drift",
        value: `${rateDrift >= 0 ? "+" : ""}${rateDrift.toFixed(1)}pp`,
        tone: rateDrift < 0 ? "bad" : "ok",
      },
      {
        label: "newly failing",
        value: String(newlyFailing),
        tone: newlyFailing ? "bad" : "ok",
      },
      { label: "newly passing", value: String(newlyPassing), tone: "ok" },
      {
        label: "avg score drift",
        value: `${scoreDrift >= 0 ? "+" : ""}${scoreDrift.toFixed(2)}`,
        tone: scoreDrift < 0 ? "warn" : "ok",
      },
    ],
    rows,
  }
}

/**
 * Validate the parsed JSON and throw a readable Error when it is not an eval report.
 */
export const assertEvalReport = (data, fileName = "file") => {
  const ok =
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    typeof data.eval_set_id === "string" &&
    Array.isArray(data.results) &&
    data.summary &&
    typeof data.summary === "object"
  if (!ok) {
    throw new Error(
      `${fileName} is not an eval report. Expected the JSON written by 10xgraph eval (eval_set_id, results, summary).`
    )
  }
  return data
}

/**
 * Parse the text of one report file into `{ id, report }`. Throws a readable Error.
 */
export const parseEvalReport = (text, fileName) => {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`${fileName} is not valid JSON.`)
  }
  return { id: fileName, report: assertEvalReport(data, fileName) }
}

const byTime = (a, b) => (a.report.timestamp ?? 0) - (b.report.timestamp ?? 0)

// Run number and previous run per eval set, in time order.
const labelRuns = (sources) => {
  const counters = new Map()
  const previous = new Map()
  const labels = new Map()
  for (const src of sources.toSorted(byTime)) {
    const set = src.report.eval_set_id
    const number = (counters.get(set) ?? 0) + 1
    counters.set(set, number)
    labels.set(src.id, {
      number,
      report: src.report,
      prev: previous.get(set) ?? null,
    })
    previous.set(set, src.id)
  }
  return labels
}

const setLabel = (report) => report.eval_set_name || report.eval_set_id

const buildRow = ({ id, number, report }, now) => ({
  id,
  name: setLabel(report),
  run: `#${number}`,
  rate: round((report.summary.pass_rate ?? 0) * 100, 1),
  status: runStatus(report),
  cases: report.summary.total_cases ?? report.results.length,
  errors: report.summary.error_cases ?? 0,
  ago: formatAgo(report.timestamp ?? now, now),
})

const buildDetail = (entry, labels) => {
  const { number, report, prev } = entry
  const s = report.summary
  const prevEntry = prev ? labels.get(prev) : null
  const model = report.config_used?.model
  const sub = [
    report.eval_set_id,
    model,
    formatStamp(report.timestamp ?? 0),
    formatDuration(s.total_duration_seconds),
  ].filter(Boolean)
  return {
    title: `${setLabel(report)} · run #${number}`,
    sub: sub.join(" · "),
    rate: round((s.pass_rate ?? 0) * 100, 1),
    status: runStatus(report),
    threshold: deriveThreshold(report),
    counts: {
      total: s.total_cases ?? 0,
      passed: s.passed_cases ?? 0,
      failed: s.failed_cases ?? 0,
      errored: s.error_cases ?? 0,
    },
    stats: buildStats(report),
    cases: report.results.map(buildCase),
    regression: prevEntry
      ? buildRegression(
          report,
          `#${number}`,
          prevEntry.report,
          `#${prevEntry.number}`
        )
      : null,
  }
}

/**
 * Build the run list (newest first) and a drilldown per run id from loaded reports.
 * `sources` is `[{ id, report }]`; `now` is epoch seconds.
 */
export const buildEvalRuns = (sources, now = Date.now() / 1000) => {
  const labels = labelRuns(sources)
  const entries = [...labels].map(([id, e]) => ({ id, ...e }))
  const runs = entries
    .toSorted((a, b) => (b.report.timestamp ?? 0) - (a.report.timestamp ?? 0))
    .map((e) => buildRow(e, now))
  const details = Object.fromEntries(
    entries.map((e) => [e.id, buildDetail(e, labels)])
  )
  return { runs, details }
}
