import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

import memoryReducer, {
  applyFilters,
  searchMemories,
  setMode,
} from "@/store/memory-slice"

const { client } = vi.hoisted(() => ({
  client: { searchMemory: vi.fn(), listMemories: vi.fn() },
}))
vi.mock("@/lib/tenxgraph-client", () => ({ getTenxGraphClient: () => client }))
vi.mock("@/lib/notify", () => ({ notifyError: vi.fn() }))

const make = () => configureStore({ reducer: { memory: memoryReducer } })
const lastRequest = () => client.searchMemory.mock.lastCall[0]

beforeEach(() => {
  vi.clearAllMocks()
  client.searchMemory.mockResolvedValue({ data: { results: [] } })
  client.listMemories.mockResolvedValue({ data: { memories: [] } })
})

describe("memory search filters", () => {
  it("sends no memory_type, category or score_threshold when unfiltered", async () => {
    await make().dispatch(searchMemories("q"))
    const req = lastRequest()
    expect(req).not.toHaveProperty("memory_type")
    expect(req).not.toHaveProperty("category")
    expect(req).not.toHaveProperty("score_threshold")
  })

  it("sends a single selected type, the category and the min score", async () => {
    const store = make()
    store.dispatch(setMode("search"))
    await store.dispatch(searchMemories("q"))
    await store.dispatch(
      applyFilters({ types: ["semantic"], cat: "prefs", minScore: 0.4 })
    )
    expect(lastRequest()).toMatchObject({
      query: "q",
      memory_type: "semantic",
      category: "prefs",
      score_threshold: 0.4,
    })
  })

  it("leaves memory_type off when several types are selected", async () => {
    const store = make()
    store.dispatch(setMode("search"))
    await store.dispatch(searchMemories("q"))
    await store.dispatch(applyFilters({ types: ["semantic", "entity"] }))
    expect(lastRequest()).not.toHaveProperty("memory_type")
  })

  it("does not search when changing filters in browse mode", async () => {
    const store = make()
    await store.dispatch(applyFilters({ cat: "prefs" }))
    expect(client.searchMemory).not.toHaveBeenCalled()
    expect(store.getState().memory.filters.cat).toBe("prefs")
  })
})
