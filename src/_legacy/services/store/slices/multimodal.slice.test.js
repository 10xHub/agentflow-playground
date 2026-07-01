import { configureStore, combineReducers } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { getMultimodalConfigMock } = vi.hoisted(() => ({
  getMultimodalConfigMock: vi.fn(),
}))

vi.mock("@api/config.api", () => ({
  getMultimodalConfig: getMultimodalConfigMock,
}))

import ct from "@constants/"

import multimodalReducer, {
  loadMultimodalConfig,
  clearError,
} from "./multimodal.slice"

const createStore = () =>
  configureStore({
    reducer: combineReducers({
      [ct.store.MULTIMODAL_STORE]: multimodalReducer,
    }),
  })

const getConfig = (store) => store.getState()[ct.store.MULTIMODAL_STORE]

describe("multimodal.slice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("starts with conservative defaults", () => {
    const store = createStore()
    const config = getConfig(store)
    expect(config.maxSizeMb).toBe(10)
    expect(config.documentHandling).toBe("extract_text")
    expect(config.status).toBe("idle")
  })

  it("loads max size and document handling from the server", async () => {
    getMultimodalConfigMock.mockResolvedValue({
      data: { media_max_size_mb: 25, document_handling: "skip" },
    })
    const store = createStore()
    await store.dispatch(loadMultimodalConfig())
    const config = getConfig(store)
    expect(config.status).toBe("succeeded")
    expect(config.maxSizeMb).toBe(25)
    expect(config.documentHandling).toBe("skip")
  })

  it("keeps defaults when fields are missing from the response", async () => {
    getMultimodalConfigMock.mockResolvedValue({ data: {} })
    const store = createStore()
    await store.dispatch(loadMultimodalConfig())
    const config = getConfig(store)
    expect(config.maxSizeMb).toBe(10)
    expect(config.documentHandling).toBe("extract_text")
  })

  it("records an error when the request fails", async () => {
    getMultimodalConfigMock.mockRejectedValue(new Error("boom"))
    const store = createStore()
    await store.dispatch(loadMultimodalConfig())
    const config = getConfig(store)
    expect(config.status).toBe("failed")
    expect(config.error).toBe("boom")

    store.dispatch(clearError())
    expect(getConfig(store).error).toBeNull()
  })
})
