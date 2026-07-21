import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { fetchStateSchemaMock, fetchStateMock, putStateMock } = vi.hoisted(
  () => ({
    fetchStateSchemaMock: vi.fn(),
    fetchStateMock: vi.fn(),
    putStateMock: vi.fn(),
  })
)

vi.mock("@api/state.api", () => ({
  fetchStateSchema: fetchStateSchemaMock,
  fetchState: fetchStateMock,
  putState: putStateMock,
}))

import reducer, {
  addNewMessage,
  clearSettings,
  fetchStateScheme,
  fetchThreadState,
  updateFullState,
  updateState,
  updateThreadState,
} from "./state.slice"

const createStore = () =>
  configureStore({
    reducer,
  })

describe("state.slice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates and clears local runtime state", () => {
    let state = reducer(
      undefined,
      updateState({
        context: [{ message_id: 1, content: "Hello" }],
        contextSummary: "Summary",
        execution_meta: { status: "running" },
      })
    )

    expect(state.state.context).toHaveLength(1)
    expect(state.state.context_summary).toBe("Summary")
    expect(state.state.execution_meta.status).toBe("running")

    state = reducer(
      state,
      updateFullState({ count: 3, context_summary: "Next" })
    )
    state = reducer(
      state,
      addNewMessage({ message: { message_id: 2, content: "World" } })
    )

    expect(state.state.count).toBe(3)
    expect(state.state.context_summary).toBe("Next")
    expect(state.state.context).toHaveLength(2)

    state = reducer(state, clearSettings())

    expect(state.schema).toEqual({})
    expect(state.state.context).toEqual([])
    expect(state.state.context_summary).toBe("")
  })

  it("loads schema defaults from the backend", async () => {
    fetchStateSchemaMock.mockResolvedValue({
      data: {
        data: {
          properties: {
            count: { default: 2 },
            enabled: { default: true },
            context: { type: "array" },
            context_summary: { type: "string" },
            execution_meta: { type: "object" },
          },
        },
      },
    })

    const store = createStore()
    await store.dispatch(fetchStateScheme())
    const state = store.getState()

    expect(state.schema.count.default).toBe(2)
    expect(state.state.count).toBe(2)
    expect(state.state.enabled).toBe(true)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it("handles thread fetch success and failure", async () => {
    fetchStateMock.mockResolvedValue({
      data: {
        context: [{ message_id: "1", content: "Hello" }],
        context_summary: "Loaded",
        execution_meta: { step: 4 },
      },
    })

    const store = createStore()
    await store.dispatch(fetchThreadState("thread-1"))

    let state = store.getState()
    expect(state.state.context_summary).toBe("Loaded")
    expect(state.state.execution_meta.step).toBe(4)

    await store.dispatch(fetchThreadState())
    state = store.getState()
    expect(state.error).toBe("Thread ID is required")
  })

  it("reads nested backend state payloads for fetch and save", async () => {
    fetchStateMock.mockResolvedValue({
      data: {
        state: {
          context_summary: "Fetched from nested payload",
          execution_meta: { step: 2, status: "completed" },
          company_name: "Hire10x AI",
        },
        metadata: { message: "OK" },
      },
    })
    putStateMock.mockResolvedValue({
      data: {
        state: {
          context_summary: "Saved from nested payload",
          execution_meta: { step: 3, status: "completed" },
          company_name: "Updated Company",
        },
        metadata: { message: "OK" },
      },
    })

    const store = createStore()

    await store.dispatch(fetchThreadState("thread-1"))
    let state = store.getState()

    expect(state.state.context_summary).toBe("Fetched from nested payload")
    expect(state.state.execution_meta.step).toBe(2)
    expect(state.state.company_name).toBe("Hire10x AI")

    await store.dispatch(
      updateThreadState({
        threadId: "thread-1",
        state: { company_name: "Updated Company" },
        config: {},
      })
    )
    state = store.getState()

    expect(state.state.context_summary).toBe("Saved from nested payload")
    expect(state.state.execution_meta.step).toBe(3)
    expect(state.state.company_name).toBe("Updated Company")
  })

  it("handles thread state update success and failure", async () => {
    putStateMock.mockResolvedValue({
      data: {
        context_summary: "Saved",
        execution_meta: { status: "done" },
      },
    })

    const store = createStore()
    await store.dispatch(
      updateThreadState({
        threadId: "thread-1",
        state: { draft: true },
        config: { mode: "safe" },
      })
    )

    let state = store.getState()
    expect(putStateMock).toHaveBeenCalledWith("thread-1", {
      state: { draft: true },
      config: { mode: "safe" },
    })
    expect(state.state.context_summary).toBe("Saved")
    expect(state.state.execution_meta.status).toBe("done")

    putStateMock.mockRejectedValueOnce(new Error("Save failed"))
    await store.dispatch(updateThreadState({ threadId: "thread-1", state: {} }))
    state = store.getState()
    expect(state.error).toBe("Save failed")
  })
})
