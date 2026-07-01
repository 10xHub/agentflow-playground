// Dummy graph data mirroring docs/mockups/graph.html.
// Nodes are cross-referenced with the tool registry by node_name (see `tools`/`mcp`
// on the `tools` node) and with graph info. Swapped for live API data in a later pass.

export const GRAPH_META = {
  ref: "graph.react:app",
  nodeCount: 4,
  edgeCount: 4,
}

// Positioned node boxes on the canvas (px, relative to the 640x380 canvas).
// `kind`: sentinel | agent | tool. `sentinel` renders as a pill.
export const NODE_BOXES = [
  { name: "START", kind: "sentinel", left: 63, top: 59 },
  {
    name: "agent",
    kind: "agent",
    left: 190,
    top: 164,
    sub: "agent · reasoning",
    runtag: "● running · step 3",
  },
  {
    name: "tools",
    kind: "tool",
    left: 410,
    top: 164,
    sub: "tool node",
    badge: "3 tools · 1 mcp",
  },
  { name: "END", kind: "sentinel", left: 218, top: 304 },
]

// Node detail data — {id, kind, desc, in/out edges} cross-referenced with the tool
// registry (by node_name) and graph info.
export const NODES = {
  START: {
    id: "n_0e11",
    kind: "sentinel",
    desc: "Graph entry point. Execution begins here and routes to the first node.",
    inn: [],
    out: [{ to: "agent" }],
  },
  agent: {
    id: "n_7c1a",
    kind: "agent",
    desc: "Reasoning node. Calls the LLM, then a conditional edge routes to tools when the model emits tool_calls, or to END when it returns a final answer.",
    inn: ["START", "tools"],
    out: [
      { to: "tools", cond: "has tool_calls" },
      { to: "END", cond: "final answer" },
    ],
    interrupt: false,
  },
  tools: {
    id: "n_3f22",
    kind: "tool",
    desc: "Tool node. Executes the model's tool_calls in parallel and feeds tool_result messages back to the agent.",
    inn: ["agent"],
    out: [{ to: "agent" }],
    interrupt: false,
    tools: [
      {
        name: "get_weather",
        src: "local",
        desc: "Current weather for a location.",
        params: "location:str, units:str",
      },
      {
        name: "get_report",
        src: "local",
        desc: "Fetch a quarterly report by period.",
        params: "quarter:str",
      },
      {
        name: "send_email",
        src: "remote",
        desc: "Client-side tool attached via POST /v1/graph/setup.",
        params: "to:str, subject:str, body:str",
      },
    ],
    mcp: [{ server: "filesystem", tools: ["fs.read", "fs.write"] }],
  },
  END: {
    id: "n_9d40",
    kind: "sentinel",
    desc: "Graph exit point. The final state is returned to the caller.",
    inn: ["agent"],
    out: [],
  },
}

// GET /v1/graph · info
export const GRAPH_INFO = [
  { k: "node_count", v: "4" },
  { k: "edge_count", v: "4" },
  { k: "checkpointer", v: "true", tone: "ok" },
  { k: "checkpointer_type", v: "PostgresCheckpointer" },
  { k: "publisher", v: "true", tone: "ok" },
  { k: "store", v: "true", tone: "ok" },
  { k: "interrupt_before", v: "none", tone: "muted" },
  { k: "interrupt_after", v: "none", tone: "muted" },
  { k: "context_type", v: "DefaultContextManager" },
  { k: "id_generator", v: "SnowflakeIDGenerator" },
  { k: "id_type", v: "int" },
  { k: "state_type", v: "AgentState" },
]

export const STATE_FIELDS = ["context", "context_summary", "execution_meta"]
