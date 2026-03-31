import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  pingBackendMock,
  fetchGraphDataMock,
} = vi.hoisted(() => ({
  pingBackendMock: vi.fn(),
  fetchGraphDataMock: vi.fn(),
}))

vi.mock("@api/setup-integration.api", () => ({
  pingBackend: pingBackendMock,
  fetchGraphData: fetchGraphDataMock,
}))

import reducer, {
  clearSettings,
  setSettings,
  testGraphEndpoint,
  testPingEndpoint,
} from "./settings.slice"

const createStore = () =>
  configureStore({
    reducer,
  })

describe("settings.slice", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  it("stores and clears settings", () => {
    let state = reducer(
      undefined,
      setSettings({
        name: "Workspace",
        backendUrl: "https://example.com",
        authToken: "token",
      })
    )

    expect(state.name).toBe("Workspace")
    expect(localStorage.getItem("backendUrl")).toBe("https://example.com")
    expect(localStorage.getItem("authToken")).toBe("token")

    state = reducer(state, clearSettings())

    expect(state.name).toBe("")
    expect(state.backendUrl).toBe("")
    expect(state.authToken).toBe("")
  })

  it("tracks successful verification flow", async () => {
    pingBackendMock.mockResolvedValue({ data: { pong: true } })
    fetchGraphDataMock.mockResolvedValue({
      data: {
        graph: { nodes: [{ id: "1" }] },
      },
    })

    const store = createStore()
    await store.dispatch(testPingEndpoint())
    await store.dispatch(testGraphEndpoint())
    const state = store.getState()

    expect(state.verification.pingStep.status).toBe("success")
    expect(state.verification.graphStep.status).toBe("success")
    expect(state.verification.isVerified).toBe(true)
    expect(state.graphData).toEqual({ nodes: [{ id: "1" }] })
    expect(state.verification.lastVerificationTime).toBeTruthy()
  })

  it("records verification failures", async () => {
    pingBackendMock.mockRejectedValue(new Error("Ping failed badly"))
    fetchGraphDataMock.mockRejectedValue(new Error("Graph failed badly"))

    const store = createStore()
    await store.dispatch(testPingEndpoint())
    await store.dispatch(testGraphEndpoint())
    const state = store.getState()

    expect(state.verification.pingStep.status).toBe("error")
    expect(state.verification.pingStep.errorMessage).toBe("Ping failed badly")
    expect(state.verification.graphStep.status).toBe("error")
    expect(state.verification.graphStep.errorMessage).toBe("Graph failed badly")
    expect(state.verification.isVerified).toBe(false)
    expect(state.graphData).toBeNull()
  })
})