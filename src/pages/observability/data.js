// Dummy observability data mirroring docs/mockups/observability.html.
// UI-only pass — swapped for live trace/telemetry data in a later pass.

export const THREAD = { id: "th_9f2a…c17" }

export const STATS = [
  { label: "duration", value: "2.42", small: "s" },
  { label: "tokens", value: "1,390" },
  { label: "est. cost", value: "$0.0042", accent: true },
  { label: "iterations", value: "2" },
  { label: "tool calls", value: "1" },
  { label: "spans", value: "7" },
]

// Deep-links to external tracing backends. `off` = not configured for this connection.
export const DEEP_LINKS = [
  { id: "logfire", label: "Logfire" },
  { id: "langsmith", label: "LangSmith" },
  { id: "jaeger", label: "Jaeger · off", off: true },
]

export const RULER = ["0ms", "600ms", "1.2s", "1.8s", "2.42s"]

// Waterfall spans. `left`/`width` are percentages of the trace window.
// `model`/`in`/`out` present => LLM span => shows GenAI semconv detail.
export const SPANS = [
  {
    id: "s0",
    name: "graph.react",
    kind: "root",
    dur: "2.42s",
    indent: "",
    label: "graph.react",
    left: 0,
    width: 100,
    spanId: "0a12…f0",
    parent: "—",
  },
  {
    id: "s1",
    name: "node: agent",
    kind: "node",
    dur: "0.53s",
    indent: "└",
    label: "agent",
    left: 0,
    width: 22,
    spanId: "3b91…a4",
    parent: "graph.react",
  },
  {
    id: "s2",
    name: "llm: gemini-2.0-flash",
    kind: "llm",
    dur: "0.44s",
    indent: "  └",
    label: "llm.generate",
    left: 2,
    width: 18,
    model: "gemini-2.0-flash",
    in: 1204,
    out: 0,
    spanId: "5d22…b1",
    parent: "node: agent",
  },
  {
    id: "s3",
    name: "node: tools",
    kind: "node",
    dur: "0.21s",
    indent: "└",
    label: "tools",
    left: 22,
    width: 10,
    spanId: "6e0c…c9",
    parent: "graph.react",
  },
  {
    id: "s4",
    name: "tool: get_weather",
    kind: "tool",
    dur: "0.21s",
    indent: "  └",
    label: "get_weather",
    left: 23,
    width: 9,
    spanId: "7a1b…d3",
    parent: "node: tools",
  },
  {
    id: "s5",
    name: "node: agent",
    kind: "node",
    dur: "1.24s",
    indent: "└",
    label: "agent",
    left: 32,
    width: 68,
    spanId: "8f3e…e7",
    parent: "graph.react",
  },
  {
    id: "s6",
    name: "llm: gemini-2.0-flash",
    kind: "llm",
    dur: "1.19s",
    indent: "  └",
    label: "llm.generate",
    left: 33,
    width: 66,
    model: "gemini-2.0-flash",
    in: 1372,
    out: 186,
    spanId: "7c1a…e0",
    parent: "node: agent",
  },
]

export const LEGEND = [
  { kind: "root", label: "graph" },
  { kind: "node", label: "node" },
  { kind: "llm", label: "llm" },
  { kind: "tool", label: "tool" },
]

export const EVENT_CHIPS = ["all", "message", "updates", "state", "error"]

export const EVENTS = [
  {
    id: "e0",
    time: "+2.31s",
    type: "message",
    node: "agent",
    summary: 'delta: "…an afternoon shower is likely"',
  },
  {
    id: "e1",
    time: "+1.98s",
    type: "state",
    node: "execution_meta",
    summary: "current_node: agent · step 4 · is_running: true",
  },
  {
    id: "e2",
    time: "+1.74s",
    type: "updates",
    node: "tools→agent",
    summary: "tool_result get_weather · 214ms · 62% precip",
  },
  {
    id: "e3",
    time: "+0.51s",
    type: "updates",
    node: "agent→tools",
    summary: 'tool_call get_weather({location:"Dhaka, BD"})',
  },
  {
    id: "e4",
    time: "+0.44s",
    type: "state",
    node: "execution_meta",
    summary: "current_node: tools · step 2",
  },
  {
    id: "e5",
    time: "+0.12s",
    type: "message",
    node: "agent",
    summary: "reasoning start · 2 steps",
  },
  {
    id: "e6",
    time: "+0.00s",
    type: "updates",
    node: "graph",
    summary: "run started · thread th_9f2a…c17",
  },
]

export const COST_CARDS = [
  { label: "total tokens", value: "1,390" },
  { label: "est. cost", value: "$0.0042", accent: true },
  { label: "latency p50 / p95", value: "1.9", small: "s", tail: " / 2.4", tailSmall: "s" },
  { label: "runs · iterations", value: "5 · 11" },
]

// `variant` maps to the categorical viz fill (node/llm/tool) or muted.
export const TOKEN_BREAKDOWN = [
  { key: "prompt", value: "1,204", pct: 86, variant: "node" },
  { key: "completion", value: "186", pct: 13, variant: "llm" },
  { key: "reasoning", value: "92", pct: 7, variant: "tool" },
  { key: "cache_read", value: "832", pct: 60, variant: "muted" },
  { key: "cache_create", value: "0", pct: 0, variant: "muted" },
  { key: "image / audio", value: "0", pct: 0, variant: "muted" },
]

export const BY_MODEL = {
  head: ["model", "tokens", "cost"],
  rows: [["gemini-2.0-flash", "1,390", "$0.0042"]],
}

export const BY_NODE = {
  head: ["node", "tokens", "calls"],
  rows: [
    ["agent", "1,390", "2"],
    ["tools/get_weather", "—", "1"],
  ],
}
