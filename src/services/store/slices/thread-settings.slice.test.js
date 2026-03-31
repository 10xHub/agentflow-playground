import { describe, expect, it } from "vitest"

import reducer, {
  removeConfigKey,
  removeInitStateKey,
  resetThreadSettings,
  setContextMetadata,
  setReadonlyData,
  setThreadId,
  setThreadTitle,
  updateConfigKey,
  updateInitStateKey,
} from "./thread-settings.slice"

describe("thread-settings.slice", () => {
  it("updates basic thread metadata", () => {
    let state = reducer(undefined, setThreadId("thread-42"))
    state = reducer(state, setThreadTitle("Weather"))

    expect(state.thread_id).toBe("thread-42")
    expect(state.thread_title).toBe("Weather")
  })

  it("updates and removes config and init state keys", () => {
    let state = reducer(
      undefined,
      updateConfigKey({ key: "mode", value: "fast" })
    )
    state = reducer(
      state,
      updateInitStateKey({ key: "draft", value: { enabled: true } })
    )

    expect(state.config).toEqual({ mode: "fast" })
    expect(state.init_state).toEqual({ draft: { enabled: true } })

    state = reducer(state, removeConfigKey("mode"))
    state = reducer(state, removeInitStateKey("draft"))

    expect(state.config).toEqual({})
    expect(state.init_state).toEqual({})
  })

  it("stores readonly totals and context metadata", () => {
    const state = reducer(
      reducer(
        undefined,
        setReadonlyData({
          total_messages: 12,
          tool_token: 5,
          total_token: 18,
          total_tool_calls: 3,
          total_human_messages: 7,
          total_ai_messages: 5,
        })
      ),
      setContextMetadata({ total_messages: 4, total_tokens: 22 })
    )

    expect(state.total_messages).toBe(12)
    expect(state.tool_token).toBe(5)
    expect(state.total_token).toBe(18)
    expect(state.total_tool_calls).toBe(3)
    expect(state.total_human_messages).toBe(7)
    expect(state.total_ai_messages).toBe(5)
    expect(state.context_total_messages).toBe(4)
    expect(state.context_total_tokens).toBe(22)
  })

  it("resets to the initial state", () => {
    const updatedState = reducer(undefined, setThreadId("thread-1"))
    const resetState = reducer(updatedState, resetThreadSettings())

    expect(resetState).toEqual(reducer(undefined, { type: "unknown" }))
  })
})
