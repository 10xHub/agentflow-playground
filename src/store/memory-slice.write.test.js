import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

import memoryReducer, { createMemory, editMemory } from "@/store/memory-slice"

const { client, notifyError, notifySuccess } = vi.hoisted(() => ({
  client: {
    storeMemory: vi.fn(),
    updateMemory: vi.fn(),
    listMemories: vi.fn(),
  },
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}))
vi.mock("@/lib/tenxgraph-client", () => ({ getTenxGraphClient: () => client }))
vi.mock("@/lib/notify", () => ({ notifyError, notifySuccess }))

const make = () => configureStore({ reducer: { memory: memoryReducer } })
const form = {
  content: "likes tea",
  memory_type: "semantic",
  category: "prefs",
  metadata: { source: "ui" },
}

beforeEach(() => {
  vi.clearAllMocks()
  client.storeMemory.mockResolvedValue({ data: { memory_id: "new1" } })
  client.updateMemory.mockResolvedValue({ data: { success: true } })
  client.listMemories.mockResolvedValue({ data: { memories: [] } })
})

describe("createMemory", () => {
  it("calls the client with the form values, refreshes and selects the new row", async () => {
    const store = make()
    const ok = await store.dispatch(createMemory(form))
    expect(ok).toBe(true)
    expect(client.storeMemory).toHaveBeenCalledWith(form)
    expect(client.listMemories).toHaveBeenCalled()
    expect(store.getState().memory.selectedId).toBe("new1")
    expect(notifySuccess).toHaveBeenCalled()
  })
  it("toasts and returns false on failure", async () => {
    client.storeMemory.mockRejectedValue(new Error("nope"))
    const store = make()
    expect(await store.dispatch(createMemory(form))).toBe(false)
    expect(notifyError).toHaveBeenCalledWith(
      "Could not save memory",
      expect.any(Error)
    )
    expect(client.listMemories).not.toHaveBeenCalled()
  })
})

describe("editMemory", () => {
  it("sends content and metadata for the id", async () => {
    const store = make()
    const ok = await store.dispatch(
      editMemory("m1", { content: "new", metadata: { a: 1 } })
    )
    expect(ok).toBe(true)
    expect(client.updateMemory).toHaveBeenCalledWith("m1", "new", {
      metadata: { a: 1 },
    })
    expect(notifySuccess).toHaveBeenCalled()
  })
  it("toasts and returns false on failure", async () => {
    client.updateMemory.mockRejectedValue(new Error("nope"))
    const store = make()
    expect(
      await store.dispatch(editMemory("m1", { content: "x", metadata: {} }))
    ).toBe(false)
    expect(notifyError).toHaveBeenCalledWith(
      "Could not update memory",
      expect.any(Error)
    )
  })
})
