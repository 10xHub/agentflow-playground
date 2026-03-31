import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  clientMock,
  getAgentFlowClientMock,
} = vi.hoisted(() => ({
  clientMock: {
    addThreadMessages: vi.fn(),
    threadMessages: vi.fn(),
    threadMessage: vi.fn(),
    deleteThreadMessage: vi.fn(),
    graphStateSchema: vi.fn(),
    threadState: vi.fn(),
    updateThreadState: vi.fn(),
    clearThreadState: vi.fn(),
    threads: vi.fn(),
    threadDetails: vi.fn(),
    deleteThread: vi.fn(),
    ping: vi.fn(),
    graph: vi.fn(),
  },
  getAgentFlowClientMock: vi.fn(),
}))

vi.mock("@/lib/agentflow-client", () => ({
  getAgentFlowClient: getAgentFlowClientMock,
}))

import { fetchGraphData, pingBackend } from "@/services/api/setup-integration.api"
import {
  deleteMessage,
  getMessage,
  listMessages,
  putMessages,
} from "@/services/api/message.api"
import {
  deleteState,
  fetchState,
  fetchStateSchema,
  putState,
} from "@/services/api/state.api"
import {
  deleteThread,
  getThread,
  listThreads,
} from "@/services/api/thread.api"

describe("api wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAgentFlowClientMock.mockReturnValue(clientMock)
  })

  it("wraps message API responses and request payloads", async () => {
    clientMock.addThreadMessages.mockResolvedValue({ data: { ok: true } })
    clientMock.threadMessages.mockResolvedValue({ data: [{ id: 1 }] })
    clientMock.threadMessage.mockResolvedValue({ data: { id: "m1" } })
    clientMock.deleteThreadMessage.mockResolvedValue({ data: { deleted: true } })

    await expect(
      putMessages("thread-1", {
        messages: [{ role: "user", content: "hello" }],
        metadata: { source: "test" },
      })
    ).resolves.toEqual({ data: { ok: true }, status: 200 })
    await expect(
      listMessages("thread-1", { search: "hello", offset: 2, limit: 5 })
    ).resolves.toEqual({ data: [{ id: 1 }], status: 200 })
    await expect(getMessage("thread-1", "m1")).resolves.toEqual({
      data: { id: "m1" },
      status: 200,
    })
    await expect(deleteMessage("thread-1", "m1")).resolves.toEqual({
      data: { deleted: true },
      status: 200,
    })

    expect(clientMock.addThreadMessages).toHaveBeenCalledWith("thread-1", {
      messages: [{ role: "user", content: "hello" }],
      config: undefined,
      metadata: { source: "test" },
    })
    expect(clientMock.threadMessages).toHaveBeenCalledWith("thread-1", {
      search: "hello",
      offset: 2,
      limit: 5,
    })
    expect(clientMock.threadMessage).toHaveBeenCalledWith("thread-1", {
      message_id: "m1",
    })
    expect(clientMock.deleteThreadMessage).toHaveBeenCalledWith("thread-1", {
      message_id: "m1",
    })
  })

  it("wraps state API responses and forwards config plus state", async () => {
    clientMock.graphStateSchema.mockResolvedValue({ data: { schema: true } })
    clientMock.threadState.mockResolvedValue({ data: { context: [] } })
    clientMock.updateThreadState.mockResolvedValue({ data: { saved: true } })
    clientMock.clearThreadState.mockResolvedValue({ data: { cleared: true } })

    await expect(fetchStateSchema()).resolves.toEqual({
      data: { schema: true },
      status: 200,
    })
    await expect(fetchState("thread-1")).resolves.toEqual({
      data: { context: [] },
      status: 200,
    })
    await expect(
      putState("thread-1", {
        config: { mode: "safe" },
        state: { count: 2 },
      })
    ).resolves.toEqual({ data: { saved: true }, status: 200 })
    await expect(deleteState("thread-1")).resolves.toEqual({
      data: { cleared: true },
      status: 200,
    })

    expect(clientMock.updateThreadState).toHaveBeenCalledWith(
      "thread-1",
      { mode: "safe" },
      { count: 2 }
    )
  })

  it("wraps thread API responses and optional filters", async () => {
    clientMock.threads.mockResolvedValue({ data: [{ id: "thread-1" }] })
    clientMock.threadDetails.mockResolvedValue({ data: { id: "thread-1" } })
    clientMock.deleteThread.mockResolvedValue({ data: { deleted: true } })

    await expect(
      listThreads({ search: "weather", offset: 1, limit: 10 })
    ).resolves.toEqual({ data: [{ id: "thread-1" }], status: 200 })
    await expect(getThread("thread-1")).resolves.toEqual({
      data: { id: "thread-1" },
      status: 200,
    })
    await expect(deleteThread("thread-1")).resolves.toEqual({
      data: { deleted: true },
      status: 200,
    })

    expect(clientMock.threads).toHaveBeenCalledWith({
      search: "weather",
      offset: 1,
      limit: 10,
    })
  })

  it("wraps setup integration endpoints", async () => {
    clientMock.ping.mockResolvedValue({ data: { pong: true } })
    clientMock.graph.mockResolvedValue({ data: { graph: { nodes: [] } } })

    await expect(pingBackend()).resolves.toEqual({
      data: { pong: true },
      status: 200,
    })
    await expect(fetchGraphData()).resolves.toEqual({
      data: { graph: { nodes: [] } },
      status: 200,
    })
  })
})