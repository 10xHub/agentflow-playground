import { configureStore } from "@reduxjs/toolkit"
import { describe, expect, it, vi } from "vitest"

import { DemoClient } from "@/lib/demo/demo-client"
import fixture from "@/lib/demo/test-fixture"
import memoryReducer, { browseMemories, searchMemories } from "@/store/memory-slice"

const { current } = vi.hoisted(() => ({ current: { client: null } }))
vi.mock("@/lib/tenxgraph-client", () => ({
  getTenxGraphClient: () => current.client,
}))

const setup = () => {
  current.client = new DemoClient(fixture)
  return configureStore({ reducer: { memory: memoryReducer } })
}

describe("memory search in demo mode", () => {
  it("serves a recorded query as the store's own search", async () => {
    const store = setup()
    await store.dispatch(searchMemories("contact preference"))
    expect(store.getState().memory.keywordMatch).toBe(false)
    expect(store.getState().memory.items.map((m) => m.id)).toEqual(["m1"])
  })

  it("flags keyword matches for an unrecorded query, without failing", async () => {
    const store = setup()
    await store.dispatch(searchMemories("broken order"))
    expect(store.getState().memory.status).toBe("ready")
    expect(store.getState().memory.keywordMatch).toBe(true)
    expect(store.getState().memory.items.map((m) => m.id)).toEqual(["m2"])
  })

  it("clears the flag when browsing", async () => {
    const store = setup()
    await store.dispatch(searchMemories("broken order"))
    await store.dispatch(browseMemories())
    expect(store.getState().memory.keywordMatch).toBe(false)
  })
})
