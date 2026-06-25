import { beforeEach, describe, expect, it, vi } from "vitest"

const { clientMock, getAgentFlowClientMock } = vi.hoisted(() => ({
  clientMock: {
    listMemories: vi.fn(),
    searchMemory: vi.fn(),
    storeMemory: vi.fn(),
    updateMemory: vi.fn(),
    deleteMemory: vi.fn(),
    forgetMemories: vi.fn(),
  },
  getAgentFlowClientMock: vi.fn(),
}))

vi.mock("@/lib/agentflow-client", () => ({
  getAgentFlowClient: getAgentFlowClientMock,
}))

import {
  listMemories,
  searchMemories,
  storeMemory,
  updateMemory,
  deleteMemory,
  forgetMemories,
} from "@/services/api/memory.api"

describe("memory.api", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAgentFlowClientMock.mockReturnValue(clientMock)
  })

  it("lists memories with config and limit", async () => {
    clientMock.listMemories.mockResolvedValue({ data: { memories: [{ id: "1" }] } })

    await expect(
      listMemories({ config: { thread_id: "t1" }, limit: 50 })
    ).resolves.toEqual({ data: { memories: [{ id: "1" }] }, status: 200 })

    expect(clientMock.listMemories).toHaveBeenCalledWith({
      config: { thread_id: "t1" },
      limit: 50,
    })
  })

  it("searches memories forwarding request and config", async () => {
    clientMock.searchMemory.mockResolvedValue({ data: { results: [] } })

    await searchMemories({
      query: "hi",
      memory_type: "episodic",
      config: { thread_id: "t1" },
    })

    expect(clientMock.searchMemory).toHaveBeenCalledWith({
      query: "hi",
      memory_type: "episodic",
      config: { thread_id: "t1" },
    })
  })

  it("stores a memory", async () => {
    clientMock.storeMemory.mockResolvedValue({ data: { memory_id: "m1" } })

    await expect(
      storeMemory({ content: "x", memory_type: "episodic", category: "c" })
    ).resolves.toEqual({ data: { memory_id: "m1" }, status: 200 })

    expect(clientMock.storeMemory).toHaveBeenCalledWith({
      content: "x",
      memory_type: "episodic",
      category: "c",
      config: {},
    })
  })

  it("updates a memory with content and metadata", async () => {
    clientMock.updateMemory.mockResolvedValue({ data: { ok: true } })

    await updateMemory("m1", "new", { metadata: { a: 1 }, config: { thread_id: "t" } })

    expect(clientMock.updateMemory).toHaveBeenCalledWith("m1", "new", {
      config: { thread_id: "t" },
      metadata: { a: 1 },
    })
  })

  it("deletes a memory", async () => {
    clientMock.deleteMemory.mockResolvedValue({ data: { deleted: true } })

    await deleteMemory("m1", { config: { thread_id: "t" } })

    expect(clientMock.deleteMemory).toHaveBeenCalledWith("m1", {
      config: { thread_id: "t" },
    })
  })

  it("forgets memories by filter", async () => {
    clientMock.forgetMemories.mockResolvedValue({ data: { success: true } })

    await forgetMemories({ memory_type: "episodic", config: {} })

    expect(clientMock.forgetMemories).toHaveBeenCalledWith({
      memory_type: "episodic",
      config: {},
    })
  })
})
