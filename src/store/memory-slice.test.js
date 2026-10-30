import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

import memoryReducer, {
  browseMemories,
  deleteMemory,
  forgetVisible,
  loaded,
} from "@/store/memory-slice"

const { client, notifyError } = vi.hoisted(() => ({
  client: {
    deleteMemory: vi.fn(),
    listMemories: vi.fn(),
  },
  notifyError: vi.fn(),
}))
vi.mock("@/lib/tenxgraph-client", () => ({ getTenxGraphClient: () => client }))
vi.mock("@/lib/notify", () => ({ notifyError }))

const rows = (n) =>
  Array.from({ length: n }, (_, i) => ({ id: `m${i + 1}`, content: "x" }))

const setup = (n = 3) => {
  const store = configureStore({ reducer: { memory: memoryReducer } })
  store.dispatch(loaded(rows(n)))
  return store
}

beforeEach(() => {
  vi.clearAllMocks()
  client.deleteMemory.mockResolvedValue({})
  client.listMemories.mockResolvedValue({ memories: [] })
})

describe("forgetVisible", () => {
  it("forgets only the ids it is given", async () => {
    const store = setup(40)
    await store.dispatch(forgetVisible(["m1", "m2"]))
    expect(client.deleteMemory).toHaveBeenCalledTimes(2)
    expect(client.deleteMemory.mock.calls.map((c) => c[0])).toEqual([
      "m1",
      "m2",
    ])
    expect(notifyError).not.toHaveBeenCalled()
  })

  it("reports partial failure once and refreshes", async () => {
    const store = setup(3)
    client.deleteMemory.mockImplementation((id) =>
      id === "m2" ? Promise.reject(new Error("boom")) : Promise.resolve({})
    )
    await store.dispatch(forgetVisible(["m1", "m2", "m3"]))
    expect(notifyError).toHaveBeenCalledTimes(1)
    expect(notifyError.mock.calls[0][0]).toContain("2 of 3")
    expect(notifyError.mock.calls[0][1]).toBe("boom")
    expect(client.listMemories).toHaveBeenCalled()
    expect(store.getState().memory.busy).toBe(false)
  })
})

describe("deleteMemory", () => {
  it("toasts and clears busy on failure", async () => {
    const store = setup(1)
    client.deleteMemory.mockRejectedValue(new Error("nope"))
    await store.dispatch(deleteMemory("m1"))
    expect(notifyError).toHaveBeenCalledWith(
      "Could not delete memory",
      expect.any(Error)
    )
    expect(store.getState().memory.busy).toBe(false)
  })
})

describe("browseMemories", () => {
  it("sends no config.collection", async () => {
    const store = setup(0)
    await store.dispatch(browseMemories())
    expect(client.listMemories).toHaveBeenCalledWith({ limit: 100 })
  })
})
