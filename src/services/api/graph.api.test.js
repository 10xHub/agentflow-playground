import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  invokeMock,
  streamMock,
  getAgentFlowClientMock,
  textMessageMock,
  MockMessage,
} = vi.hoisted(() => {
  class MockMessage {
    constructor(role, content, message_id = null) {
      this.role = role
      this.content = content
      this.message_id = message_id
    }
  }

  const textMessageMock = vi.fn(
    (content, role, message_id = null) =>
      new MockMessage(role, content, message_id)
  )

  MockMessage.text_message = textMessageMock

  return {
    invokeMock: vi.fn(),
    streamMock: vi.fn(),
    getAgentFlowClientMock: vi.fn(),
    textMessageMock,
    MockMessage,
  }
})

vi.mock("@/lib/agentflow-client", () => ({
  getAgentFlowClient: getAgentFlowClientMock,
}))

vi.mock("@10xscale/agentflow-client", () => ({
  Message: MockMessage,
}))

import { invokeGraph, streamGraph } from "@/services/api/graph.api"

describe("graph.api", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAgentFlowClientMock.mockReturnValue({
      invoke: invokeMock,
      stream: streamMock,
    })
  })

  it("maps messages before invoking the graph and normalizes the response", async () => {
    const existingMessage = new MockMessage(
      "assistant",
      [{ type: "text" }],
      "m1"
    )

    invokeMock.mockResolvedValue({
      messages: [{ id: "reply" }],
      state: { status: "done" },
      context: ["ctx"],
      summary: "Completed",
      meta: { source: "test" },
      all_messages: [{ id: "all" }],
      iterations: 3,
      recursion_limit_reached: true,
    })

    const result = await invokeGraph({
      messages: [
        existingMessage,
        { content: "hello", role: "user", message_id: "m2" },
        {
          content: [{ type: "text", text: "structured" }],
          role: "assistant",
          message_id: "m3",
        },
      ],
      initial_state: { draft: true },
      config: { mode: "fast" },
      recursion_limit: 9,
      response_granularity: "high",
    })

    expect(textMessageMock).toHaveBeenCalledWith("hello", "user", "m2")
    expect(invokeMock).toHaveBeenCalledWith(
      [
        existingMessage,
        expect.objectContaining({
          role: "user",
          content: "hello",
          message_id: "m2",
        }),
        expect.objectContaining({
          role: "assistant",
          content: [{ type: "text", text: "structured" }],
          message_id: "m3",
        }),
      ],
      {
        initial_state: { draft: true },
        config: { mode: "fast" },
        recursion_limit: 9,
        response_granularity: "high",
      }
    )
    expect(result).toEqual({
      messages: [{ id: "reply" }],
      state: { status: "done" },
      context: ["ctx"],
      summary: "Completed",
      meta: { source: "test" },
      all_messages: [{ id: "all" }],
      iterations: 3,
      recursion_limit_reached: true,
    })
  })

  it("defaults missing response fields when invoking the graph", async () => {
    invokeMock.mockResolvedValue({})

    const result = await invokeGraph({ messages: [] })

    expect(result).toEqual({
      messages: [],
      state: undefined,
      context: undefined,
      summary: undefined,
      meta: {},
      all_messages: [],
      iterations: 0,
      recursion_limit_reached: false,
    })
  })

  it("formats stream chunks and registers the abort listener", async () => {
    streamMock.mockReturnValue(
      (async function* streamSource() {
        yield {
          event: "message",
          message: { delta: "hello", content: "hello" },
          metadata: { step: 1 },
        }
        yield {
          event: "updates",
          state: { running: true },
          updates: [{ id: 1 }],
        }
        yield {
          event: "custom",
          detail: "done",
        }
      })()
    )

    const controller = new AbortController()
    const addEventListenerSpy = vi.spyOn(controller.signal, "addEventListener")
    const chunks = []

    for await (const chunk of streamGraph(
      { messages: [] },
      controller.signal
    )) {
      chunks.push(chunk)
    }

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "abort",
      expect.any(Function)
    )
    expect(chunks).toEqual([
      {
        data: {
          message: { delta: "hello", content: "hello" },
          delta: "hello",
          metadata: { step: 1 },
        },
      },
      {
        data: {
          state: { running: true },
          updates: [{ id: 1 }],
          metadata: {},
        },
      },
      {
        data: {
          event: "custom",
          detail: "done",
          metadata: {},
        },
      },
    ])
  })
})
