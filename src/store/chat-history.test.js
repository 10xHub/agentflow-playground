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
