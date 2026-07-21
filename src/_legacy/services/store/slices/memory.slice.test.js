import { configureStore, combineReducers } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  listMemoriesMock,
  searchMemoriesMock,
  storeMemoryMock,
  updateMemoryMock,
  deleteMemoryMock,
  forgetMemoriesMock,
} = vi.hoisted(() => ({
  listMemoriesMock: vi.fn(),
  searchMemoriesMock: vi.fn(),
  storeMemoryMock: vi.fn(),
  updateMemoryMock: vi.fn(),
  deleteMemoryMock: vi.fn(),
  forgetMemoriesMock: vi.fn(),
}))

vi.mock("@api/memory.api", () => ({
  listMemories: listMemoriesMock,
  searchMemories: searchMemoriesMock,
  storeMemory: storeMemoryMock,
  updateMemory: updateMemoryMock,
  deleteMemory: deleteMemoryMock,
  forgetMemories: forgetMemoriesMock,
}))

import ct from "@constants/"

import memoryReducer, {
  loadMemories,
  searchMemories,
  createMemory,
  removeMemory,
  setScope,
  setMode,
  setSearchField,
  setSelected,
} from "./memory.slice"

const chatReducer = (state = { activeThreadId: "thread-1" }) => state

const createStore = () =>
  configureStore({
    reducer: combineReducers({
      [ct.store.MEMORY_STORE]: memoryReducer,
      [ct.store.CHAT_STORE]: chatReducer,
    }),
  })

const getMemory = (store) => store.getState()[ct.store.MEMORY_STORE]

describe("memory.slice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads memories into items (scope all -> empty config)", async () => {
    listMemoriesMock.mockResolvedValue({ data: { memories: [{ id: "1" }] } })
    const store = createStore()

    await store.dispatch(loadMemories())

    expect(listMemoriesMock).toHaveBeenCalledWith({ config: {}, limit: 100 })
    expect(getMemory(store).items).toEqual([{ id: "1" }])
    expect(getMemory(store).status).toBe("succeeded")
  })

  it("scopes to the active thread when scope is thread", async () => {
    listMemoriesMock.mockResolvedValue({ data: { memories: [] } })
    const store = createStore()
    store.dispatch(setScope("thread"))

    await store.dispatch(loadMemories())

    expect(listMemoriesMock).toHaveBeenCalledWith({
      config: { thread_id: "thread-1" },
      limit: 100,
    })
  })

  it("drops empty search fields before calling the api", async () => {
    searchMemoriesMock.mockResolvedValue({ data: { results: [{ id: "r1" }] } })
    const store = createStore()
    store.dispatch(setSearchField({ field: "query", value: "weather" }))

    await store.dispatch(searchMemories())

    const call = searchMemoriesMock.mock.calls[0][0]
    expect(call.query).toBe("weather")
    expect(call).not.toHaveProperty("memory_type")
    expect(call).not.toHaveProperty("category")
    expect(getMemory(store).items).toEqual([{ id: "r1" }])
  })

  it("refreshes the current view after creating a memory", async () => {
    storeMemoryMock.mockResolvedValue({ data: { memory_id: "m1" } })
    listMemoriesMock.mockResolvedValue({ data: { memories: [{ id: "m1" }] } })
    const store = createStore()

    await store.dispatch(
      createMemory({ content: "x", memory_type: "episodic", category: "c" })
    )

    expect(storeMemoryMock).toHaveBeenCalled()
    expect(listMemoriesMock).toHaveBeenCalled()
    expect(getMemory(store).items).toEqual([{ id: "m1" }])
  })

  it("clears selection when the selected memory is gone after refresh", async () => {
    deleteMemoryMock.mockResolvedValue({ data: { deleted: true } })
    listMemoriesMock.mockResolvedValue({ data: { memories: [] } })
    const store = createStore()
    store.dispatch(setSelected("gone"))

    await store.dispatch(removeMemory("gone"))

    expect(deleteMemoryMock).toHaveBeenCalledWith("gone", { config: {} })
    expect(getMemory(store).selectedId).toBeNull()
  })

  it("records an error when a load fails", async () => {
    listMemoriesMock.mockRejectedValue(new Error("boom"))
    const store = createStore()

    await store.dispatch(loadMemories())

    expect(getMemory(store).status).toBe("failed")
    expect(getMemory(store).error).toBe("boom")
  })

  it("toggles mode", () => {
    let state = memoryReducer(undefined, setMode("search"))
    expect(state.mode).toBe("search")
    state = memoryReducer(state, setMode("browse"))
    expect(state.mode).toBe("browse")
  })
})
