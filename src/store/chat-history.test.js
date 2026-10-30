import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { mapStoredMessages, openServerThread } from "@/store/chat-history"
import chatReducer from "@/store/chat-slice"
import threadsReducer, { listLoaded, removeThread } from "@/store/threads-slice"

const { client, notifyError } = vi.hoisted(() => ({
  client: { threadMessages: vi.fn(), deleteThread: vi.fn() },
  notifyError: vi.fn(),
}))
vi.mock("@/lib/tenxgraph-client", () => ({ getTenxGraphClient: () => client }))
vi.mock("@/lib/notify", () => ({ notifyError }))

const STORED = [
  {
    message_id: "u1",
    role: "user",
    content: [{ type: "text", text: "weather?" }],
  },
  {
    message_id: "a1",
    role: "assistant",
    content: [
      { type: "reasoning", summary: "think" },
      { type: "tool_call", id: "c1", name: "get_weather", args: { city: "X" } },
    ],
  },
  {
    message_id: "t1",
    role: "tool",
    content: [{ type: "tool_result", call_id: "c1", output: "sunny" }],
  },
  {
    message_id: "a2",
    role: "assistant",
    content: [{ type: "text", text: "Sunny." }],
  },
]

const makeStore = () =>
  configureStore({ reducer: { chat: chatReducer, threads: threadsReducer } })

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe("mapStoredMessages", () => {
  it("folds assistant and tool rows into one agent turn after the user message", () => {
    const out = mapStoredMessages(STORED)
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ role: "user", text: "weather?" })
    expect(out[1].role).toBe("agent")
    expect(out[1].answer).toEqual(["Sunny."])
    expect(out[1].blocks.map((b) => b.kind)).toEqual([
      "reasoning",
      "tool_call",
      "tool_result",
    ])
    expect(out[1].blocks[1]).toMatchObject({
      callId: "c1",
      name: "get_weather",
    })
  })

  it("skips system rows and handles string tool content", () => {
    const out = mapStoredMessages([
      { role: "system", content: "x" },
      { role: "user", content: "hi" },
      {
        role: "tool",
        content: "42",
        metadata: { tool_call_id: "c", function_name: "f" },
      },
    ])
    expect(out[0].text).toBe("hi")
    expect(out[1].blocks[0]).toMatchObject({
      kind: "tool_result",
      callId: "c",
      name: "f",
    })
  })
})

describe("openServerThread", () => {
  it("loads the history and sets the active server thread id", async () => {
    client.threadMessages.mockResolvedValue({ data: { messages: STORED } })
    const store = makeStore()
    expect(await store.dispatch(openServerThread("srv-1"))).toBe(true)
    expect(client.threadMessages).toHaveBeenCalledWith("srv-1", {
      offset: 0,
      limit: 100,
    })
    const { chat } = store.getState()
    expect(chat.threadId).toBe("srv-1")
    expect(chat.messages).toHaveLength(2)
    expect(chat.threads.order[0]).toBe("srv-1")
  })

  it("keeps Chat unchanged and reports when the history cannot load", async () => {
    client.threadMessages.mockRejectedValue(new Error("boom"))
    const store = makeStore()
    expect(await store.dispatch(openServerThread("srv-1"))).toBe(false)
    expect(store.getState().chat.threadId).toBeNull()
    expect(notifyError).toHaveBeenCalled()
  })
})

describe("deleting a thread in Threads", () => {
  it("resets Chat to a clean draft when it was the active thread", async () => {
    client.threadMessages.mockResolvedValue({ data: { messages: STORED } })
    client.deleteThread.mockResolvedValue({})
    const store = makeStore()
    store.dispatch(listLoaded([{ thread_id: "srv-1" }]))
    await store.dispatch(openServerThread("srv-1"))
    await store.dispatch(removeThread("srv-1"))
    const { chat } = store.getState()
    expect(chat.threadId).toBeNull()
    expect(chat.messages).toEqual([])
    expect(chat.threads.byId["srv-1"]).toBeUndefined()
  })
})

// Trimmed from a real GET /v1/threads/{id}/messages response (10xgraph-api
// 1.0.0rc1): the tool call is both a content block and in tools_calls, and the
// tool_result block has no name (it is in metadata.function_name).
const REAL = [
  {
    message_id: "m1",
    role: "user",
    timestamp: 1793181627.77,
    content: [{ type: "text", text: "HI", annotations: [] }],
    tools_calls: null,
    metadata: {},
  },
  {
    message_id: "m2",
    role: "assistant",
    timestamp: 1793181627.8,
    content: [
      { type: "reasoning", summary: "Planning", details: null },
      {
        type: "tool_call",
        id: "call_1",
        name: "get_weather",
        args: { location: "X" },
        tool_type: null,
      },
    ],
    tools_calls: [
      {
        id: "call_1",
        type: "function",
        function: { name: "get_weather", arguments: '{"location": "X"}' },
      },
    ],
    metadata: {},
  },
  {
    message_id: "m3",
    role: "tool",
    timestamp: 1793181627.81,
    content: [
      {
        type: "tool_result",
        call_id: "call_1",
        output: [{ temp_c: 31 }],
        is_error: false,
        status: "completed",
      },
    ],
    tools_calls: null,
    metadata: { function_name: "get_weather", tool_call_id: "call_1" },
  },
  {
    message_id: "m4",
    role: "assistant",
    timestamp: 1793181627.82,
    content: [
      { type: "reasoning", summary: "Reading", details: null },
      { type: "text", text: "Warm.", annotations: [] },
    ],
    tools_calls: null,
    metadata: {},
  },
]

describe("real API shape", () => {
  it("maps one tool call once, names the result, keeps order", () => {
    const out = mapStoredMessages(REAL)
    expect(out.map((m) => m.role)).toEqual(["user", "agent"])
    const kinds = out[1].blocks.map((b) => b.kind)
    expect(kinds).toEqual([
      "reasoning",
      "tool_call",
      "tool_result",
      "reasoning",
    ])
    expect(out[1].blocks[2]).toMatchObject({
      callId: "call_1",
      name: "get_weather",
    })
    expect(out[1].answer).toEqual(["Warm."])
  })

  it("falls back to tools_calls when content has no tool_call block", () => {
    const out = mapStoredMessages([
      { role: "user", content: "q" },
      {
        role: "assistant",
        content: [{ type: "text", text: "" }],
        tools_calls: [
          { id: "c9", function: { name: "f", arguments: '{"a":1}' } },
        ],
      },
    ])
    expect(out[1].blocks[0]).toMatchObject({
      kind: "tool_call",
      callId: "c9",
      name: "f",
    })
    expect(out[1].blocks[0].code).toContain('"a": 1')
  })
})

describe("mapStoredMessages steps", () => {
  const row = (id, role, node, content, extra = {}) => ({
    message_id: id,
    role,
    content,
    metadata: node ? { node_name: node } : {},
    ...extra,
  })
  const txt = (t) => [{ type: "text", text: t }]

  it("groups a turn by metadata.node into steps", () => {
    const [, turn] = mapStoredMessages([
      row("u", "user", null, txt("go")),
      row("a1", "assistant", "PLAN", txt("plan 1")),
      row("a2", "assistant", "REFLECT", txt("reflect 1")),
      row("a3", "assistant", "PLAN", txt("plan 2")),
      row("a4", "assistant", "PLAN", txt("plan 2b")),
    ])
    expect(turn.steps).toEqual([
      { node: "PLAN", round: 1, text: "plan 1" },
      { node: "REFLECT", round: 1, text: "reflect 1" },
      { node: "PLAN", round: 2, text: "plan 2" },
      { node: "PLAN", round: 3, text: "plan 2b" },
    ])
    expect(turn.node).toBe("PLAN")
  })

  it("marks a step internal when its row has metadata.internal", () => {
    const [, turn] = mapStoredMessages([
      row("u", "user", null, txt("HI")),
      row("a1", "assistant", "PLAN", txt("What can I help with?")),
      row("a2", "assistant", "REFLECT", txt("Greeting handled."), {
        metadata: { node_name: "REFLECT", internal: true },
      }),
    ])
    expect(turn.steps).toEqual([
      { node: "PLAN", round: 1, text: "What can I help with?" },
      { node: "REFLECT", round: 1, text: "Greeting handled.", internal: true },
    ])
  })

  it("puts tool rows in the step of their node", () => {
    const [, turn] = mapStoredMessages([
      row("u", "user", null, txt("go")),
      row("a1", "assistant", "PLAN", [
        { type: "tool_call", id: "c1", name: "f", args: {} },
      ]),
      row("t1", "tool", "ACT", "result", {
        metadata: { node: "ACT", tool_call_id: "c1" },
      }),
    ])
    expect(turn.blocks.map((b) => [b.kind, b.step])).toEqual([
      ["tool_call", 0],
      ["tool_result", 1],
    ])
  })

  it("reads metadata.node_name first and falls back to metadata.node", () => {
    const [, turn] = mapStoredMessages([
      row("u", "user", null, txt("go")),
      row("a1", "assistant", null, txt("plan"), {
        metadata: { node_name: "PLAN", node: "other" },
      }),
      row("a2", "assistant", "REFLECT", txt("reflect")),
    ])
    expect(turn.steps.map((s) => s.node)).toEqual(["PLAN", "REFLECT"])
  })

  it("lets a row without a node join the current step", () => {
    const [, turn] = mapStoredMessages([
      row("u", "user", null, txt("go")),
      row("s0", "assistant", null, txt("lead")),
      row("a1", "assistant", "PLAN", txt("plan")),
      row("s1", "assistant", null, txt("synthetic")),
      row("a2", "assistant", "REFLECT", txt("reflect")),
    ])
    expect(turn.steps).toEqual([
      { node: "PLAN", round: 1, text: "lead\n\nplan\n\nsynthetic" },
      { node: "REFLECT", round: 1, text: "reflect" },
    ])
  })

  it("falls back to one joined answer when rows have no node", () => {
    const [, turn] = mapStoredMessages([
      row("u", "user", null, txt("go")),
      row("a1", "assistant", null, txt("one")),
      row("a2", "assistant", null, txt("two")),
    ])
    expect(turn.steps).toEqual([])
    expect(turn.answer).toEqual(["one\n\ntwo"])
  })
})

describe("mapStoredMessages repeated node runs", () => {
  const row = (id, role, node, content) => ({
    message_id: id,
    role,
    content,
    metadata: node ? { node_name: node } : {},
  })
  const txt = (t) => [{ type: "text", text: t }]

  it("gives each run of the same node its own step, and keeps a tool loop together", () => {
    const [, turn] = mapStoredMessages([
      row("u", "user", null, txt("go")),
      row("a1", "assistant", "WEATHER", [
        { type: "tool_call", id: "c1", name: "get_weather", args: {} },
      ]),
      row("t1", "tool", "WEATHER_TOOL", [
        { type: "tool_result", call_id: "c1", output: "sunny" },
      ]),
      row("a2", "assistant", "WEATHER", txt("It is sunny.")),
      row("a3", "assistant", "PLANNER", txt("Wear a hat.")),
      row("a4", "assistant", "PLANNER", txt("Also sunscreen.")),
    ])
    expect(turn.steps.map((s) => [s.node, s.round, s.text])).toEqual([
      ["WEATHER", 1, ""],
      ["WEATHER_TOOL", 1, ""],
      ["WEATHER", 2, "It is sunny."],
      ["PLANNER", 1, "Wear a hat."],
      ["PLANNER", 2, "Also sunscreen."],
    ])
  })
})

describe("mapStoredMessages skipped calls", () => {
  it("marks the result of a call skipped by a handoff", () => {
    const [, turn] = mapStoredMessages([
      {
        message_id: "u",
        role: "user",
        content: [{ type: "text", text: "go" }],
      },
      {
        message_id: "a",
        role: "assistant",
        content: [],
        tools_calls: [
          {
            id: "c1",
            function: { name: "transfer_to_weather", arguments: "{}" },
          },
          {
            id: "c2",
            function: { name: "transfer_to_planner", arguments: "{}" },
          },
        ],
        metadata: { node_name: "TRIAGE" },
      },
      {
        message_id: "t1",
        role: "tool",
        content: [
          {
            type: "tool_result",
            call_id: "c1",
            output: "Transferred to WEATHER.",
          },
        ],
        metadata: { node_name: "TRIAGE_HANDOFF" },
      },
      {
        message_id: "t2",
        role: "tool",
        content: [
          {
            type: "tool_result",
            call_id: "c2",
            output: "Not run: control was transferred to WEATHER.",
          },
        ],
        metadata: { node_name: "TRIAGE_HANDOFF", not_run: true },
      },
    ])
    const results = turn.blocks.filter((b) => b.kind === "tool_result")
    expect(results.map((b) => [b.callId, Boolean(b.notRun)])).toEqual([
      ["c1", false],
      ["c2", true],
    ])
  })
})
