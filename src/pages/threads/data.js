// Dummy thread inspector data mirroring docs/mockups/threads.html.
// Swapped for live API data in a later pass. UI-only — no fetch.

export const FILTERS = [
  { key: "all", label: "all", n: 142 },
  { key: "running", label: "running", n: 3 },
  { key: "interrupted", label: "interrupted", n: 6 },
  { key: "error", label: "error", n: 2 },
]

export const THREADS = [
  {
    id: "th_9f2a…c17",
    fullId: "th_9f2a3b8e1d40c17",
    status: "error",
    user: "u_8842",
    msgs: 14,
    ago: "3m ago",
    created: "2026-07-01 14:02",
    lastActive: "3m ago",
    agent: "graph.react:app",
  },
  {
    id: "th_71bd…9a2",
    fullId: "th_71bd0c94f2e39a2",
    status: "interrupted",
    user: "u_1290",
    msgs: 8,
    ago: "12m ago",
    created: "2026-07-01 13:51",
    lastActive: "12m ago",
    agent: "graph.react:app",
  },
  {
    id: "th_5c03…4e1",
    fullId: "th_5c03a71bd8f04e1",
    status: "running",
    user: "u_4471",
    msgs: 22,
    ago: "now",
    created: "2026-07-01 14:03",
    lastActive: "now",
    agent: "graph.react:app",
  },
  {
    id: "th_2a8f…b60",
    fullId: "th_2a8fe0c14d99b60",
    status: "healthy",
    user: "u_8842",
    msgs: 31,
    ago: "1h ago",
    created: "2026-07-01 13:04",
    lastActive: "1h ago",
    agent: "graph.react:app",
  },
  {
    id: "th_d417…7cc",
    fullId: "th_d4170a92bce17cc",
    status: "healthy",
    user: "u_0031",
    msgs: 6,
    ago: "2h ago",
    created: "2026-07-01 12:10",
    lastActive: "2h ago",
    agent: "graph.react:app",
  },
  {
    id: "th_e920…13a",
    fullId: "th_e9201f8a3c4713a",
    status: "idle",
    user: "u_5560",
    msgs: 3,
    ago: "5h ago",
    created: "2026-07-01 09:22",
    lastActive: "5h ago",
    agent: "graph.react:app",
  },
  {
    id: "th_bb14…802",
    fullId: "th_bb1490a2ce7f802",
    status: "healthy",
    user: "u_4471",
    msgs: 12,
    ago: "6h ago",
    created: "2026-07-01 08:40",
    lastActive: "6h ago",
    agent: "graph.react:app",
  },
  {
    id: "th_47af…9f0",
    fullId: "th_47af0b91d2ce9f0",
    status: "idle",
    user: "u_1290",
    msgs: 19,
    ago: "1d ago",
    created: "2026-06-30 15:12",
    lastActive: "1d ago",
    agent: "graph.react:app",
  },
]

// Message trail for the selected (error) thread — the dangling tool_call case.
export const MESSAGES = [
  {
    id: "msg_1a",
    role: "user",
    node: "msg_1a",
    nodeLabel: false,
    time: "14:02:11",
    body: "Summarize the Q2 report and email the summary to the growth team.",
  },
  {
    id: "msg_2a",
    role: "assistant",
    node: "agent",
    nodeLabel: true,
    time: "14:02:13",
    body: "Fetching the report, then I'll summarize and send it.",
    mono: 'tool_call · get_report(quarter="Q2")',
  },
  {
    id: "msg_3a",
    role: "tool",
    node: "get_report",
    nodeMeta: "· 180ms",
    time: "14:02:14",
    pre: '{ "title": "Q2 Growth", "pages": 12, "revenue_delta_pct": 18.4 }',
  },
  {
    id: "msg_4f",
    role: "tool",
    roleLabel: "assistant → tool",
    node: "send_email",
    time: "14:02:16",
    broken: true,
    brokenTag: "dangling · no result",
    pre: `{ "tool_call_id": "call_4f8a", "name": "send_email", "arguments": {} }
// awaiting tool_result … never arrived · run stalled`,
  },
]

// Turn dividers keyed by the message id they precede.
export const TURNS = {
  msg_1a: "turn 1",
  msg_4f: "turn 2 · wedged",
}

export const EXECUTION_META = [
  { k: "current_node", v: "tools", tone: "warn" },
  { k: "step", v: "6" },
  { k: "is_running", v: "false", tone: "bad" },
  { k: "interrupted", v: "true", tone: "warn" },
  { k: "stopped", v: "false", tone: "muted" },
  { k: "interrupt", v: "tool_call · send_email" },
]

export const CONTEXT = [
  { k: "messages", v: "14" },
  { k: "context_summary", v: "none", tone: "muted" },
  { k: "thread_id", v: "th_9f2a…c17" },
  { k: "checkpoint_id", v: "ckpt_71a3" },
  { k: "recursion_limit", v: "25" },
  { k: "updated", v: "3m ago" },
]

// JSON blobs as pre-highlighted token arrays. Each token: { t: text, c: class|null }.
export const CONFIG_JSON = [
  [{ t: "{", c: null }],
  [
    { t: "  ", c: null },
    { t: '"configurable"', c: "key" },
    { t: ": {", c: null },
  ],
  [
    { t: "    ", c: null },
    { t: '"thread_id"', c: "key" },
    { t: ": ", c: null },
    { t: '"th_9f2a3b8e1d40c17"', c: "str" },
    { t: ",", c: null },
  ],
  [
    { t: "    ", c: null },
    { t: '"user_id"', c: "key" },
    { t: ": ", c: null },
    { t: '"u_8842"', c: "str" },
    { t: ",", c: null },
  ],
  [
    { t: "    ", c: null },
    { t: '"recursion_limit"', c: "key" },
    { t: ": ", c: null },
    { t: "25", c: "num" },
    { t: ",", c: null },
  ],
  [
    { t: "    ", c: null },
    { t: '"response_granularity"', c: "key" },
    { t: ": ", c: null },
    { t: '"partial"', c: "str" },
  ],
  [{ t: "  }", c: null }],
  [{ t: "}", c: null }],
]

export const RAW_JSON = [
  [{ t: "{", c: null }],
  [
    { t: "  ", c: null },
    { t: '"thread_id"', c: "key" },
    { t: ": ", c: null },
    { t: '"th_9f2a3b8e1d40c17"', c: "str" },
    { t: ",", c: null },
  ],
  [
    { t: "  ", c: null },
    { t: '"status"', c: "key" },
    { t: ": ", c: null },
    { t: '"error"', c: "str" },
    { t: ",", c: null },
  ],
  [
    { t: "  ", c: null },
    { t: '"message_count"', c: "key" },
    { t: ": ", c: null },
    { t: "14", c: "num" },
    { t: ",", c: null },
  ],
  [
    { t: "  ", c: null },
    { t: '"execution_meta"', c: "key" },
    { t: ": {", c: null },
  ],
  [
    { t: "    ", c: null },
    { t: '"current_node"', c: "key" },
    { t: ": ", c: null },
    { t: '"tools"', c: "str" },
    { t: ",", c: null },
  ],
  [
    { t: "    ", c: null },
    { t: '"step"', c: "key" },
    { t: ": ", c: null },
    { t: "6", c: "num" },
    { t: ",", c: null },
  ],
  [
    { t: "    ", c: null },
    { t: '"is_running"', c: "key" },
    { t: ": ", c: null },
    { t: "false", c: "bool" },
    { t: ",", c: null },
  ],
  [
    { t: "    ", c: null },
    { t: '"interrupted"', c: "key" },
    { t: ": ", c: null },
    { t: "true", c: "bool" },
    { t: ",", c: null },
  ],
  [
    { t: "    ", c: null },
    { t: '"interrupt"', c: "key" },
    { t: ": { ", c: null },
    { t: '"type"', c: "key" },
    { t: ": ", c: null },
    { t: '"tool_call"', c: "str" },
    { t: ", ", c: null },
    { t: '"tool"', c: "key" },
    { t: ": ", c: null },
    { t: '"send_email"', c: "str" },
    { t: " }", c: null },
  ],
  [{ t: "  },", c: null }],
  [
    { t: "  ", c: null },
    { t: '"last_error"', c: "key" },
    { t: ": ", c: null },
    { t: '"dangling tool_call: no tool_result for call_4f8a"', c: "str" },
  ],
  [{ t: "}", c: null }],
]
