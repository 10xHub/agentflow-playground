// A small fixture in the recorded shape (demo/record.mjs), for unit tests only.
const RECORDED = "2026-10-15T00:00:00"
const PREFERS_EMAIL = "Customer c_88 prefers email"
const meta = {
  request_id: "r",
  timestamp: RECORDED,
  message: "OK",
}
const ok = (data) => ({ data, metadata: meta })
const memory = (id, content) => ({
  id,
  content,
  score: 1,
  memory_type: "episodic",
  metadata: {},
  vector: [],
  user_id: "anonymous",
  thread_id: null,
  timestamp: RECORDED,
})
const chunk = (text) => ({
  event: "message",
  message: { role: "assistant", content: [{ type: "text", text }] },
})

const fixture = {
  id: "support",
  title: "Test scenario",
  recordedAt: "2026-10-15T00:00:00Z",
  versions: { "10xgraph-client": "0.6.0", model: "scripted" },
  ping: ok("pong"),
  graph: ok({
    info: { node_count: 2, edge_count: 2, checkpointer: true },
    nodes: [],
    edges: [],
  }),
  graphTools: ok({ node_count: 1, tool_count: 1, nodes: [] }),
  graphStateSchema: ok({ title: "AgentState", properties: {} }),
  threads: ok({
    threads: [
      { thread_id: "t1", thread_name: "one" },
      { thread_id: "t2", thread_name: "two" },
    ],
  }),
  threadState: {
    t1: ok({ state: { context: [] } }),
    t2: ok({ state: { context: [] } }),
  },
  threadMessages: {
    t1: ok({ messages: [] }),
    t2: ok({ messages: [] }),
  },
  observability: {
    t1: {
      latest: ok({
        thread_id: "t1",
        run_count: 1,
        run_ids: ["run1"],
        run: { run_id: "run1" },
      }),
      runs: {
        run1: ok({
          thread_id: "t1",
          run_count: 1,
          run_ids: ["run1"],
          run: { run_id: "run1" },
        }),
      },
    },
  },
  memories: {
    list: ok({
      memories: [
        memory("m1", PREFERS_EMAIL),
        memory("m2", "Order 1042 arrived broken"),
      ],
    }),
    search: {
      "contact preference": ok({
        results: [memory("m1", PREFERS_EMAIL)],
      }),
    },
  },
  evals: {
    runs: { runs: [{ id: "r1", name: "suite", rate: 80, cases: 5 }] },
    detail: { r1: { title: "suite", cases: [] } },
  },
  runs: [
    {
      id: "a",
      label: "First",
      prompt: "first prompt",
      pillar: 4,
      after: null,
      threadId: "t1",
      ended: "complete",
      chunks: [
        { t: 0, chunk: chunk("one") },
        { t: 40, chunk: chunk("two") },
      ],
    },
    {
      id: "b",
      label: "Second",
      prompt: "second prompt",
      pillar: 2,
      after: "a",
      threadId: "t1",
      ended: "complete",
      chunks: [{ t: 0, chunk: chunk("three") }],
    },
  ],
}

export default fixture
