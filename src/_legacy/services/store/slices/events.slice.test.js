import { describe, expect, it, vi } from "vitest"

import reducer, {
  beginStreamEvents,
  clearEvents,
  finishStreamEvents,
  recordStreamEvent,
} from "./events.slice"

describe("events.slice", () => {
  it("records normalized stream events", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-03T10:00:00.000Z"))

    const state = reducer(
      undefined,
      recordStreamEvent({
        event: "message",
        thread_id: 42,
        run_id: "run-1",
        timestamp: 1775198359.160338,
      })
    )

    expect(state.entries).toHaveLength(1)
    expect(state.entries[0]).toMatchObject({
      event: "message",
      threadId: "42",
      runId: "run-1",
      timestamp: 1775198359160.338,
    })
  })

  it("starts and finishes a stream capture session", () => {
    let state = reducer(undefined, beginStreamEvents("thread-99"))

    expect(state.entries).toEqual([])
    expect(state.activeThreadId).toBe("thread-99")
    expect(state.isStreaming).toBe(true)

    state = reducer(state, finishStreamEvents("thread-100"))

    expect(state.activeThreadId).toBe("thread-100")
    expect(state.isStreaming).toBe(false)
  })

  it("clears recorded events", () => {
    const stateWithEvent = reducer(
      undefined,
      recordStreamEvent({ event: "updates" })
    )

    const clearedState = reducer(stateWithEvent, clearEvents())

    expect(clearedState.entries).toEqual([])
    expect(clearedState.activeThreadId).toBeNull()
    expect(clearedState.isStreaming).toBe(false)
  })

  it("keeps only the latest 200 events", () => {
    let state = reducer(undefined, { type: "test/init" })

    for (let index = 0; index < 205; index += 1) {
      state = reducer(
        state,
        recordStreamEvent({
          event: `event-${index}`,
          timestamp: `2026-04-03T10:00:${String(index).padStart(2, "0")}Z`,
        })
      )
    }

    expect(state.entries).toHaveLength(200)
    expect(state.entries[0].event).toBe("event-204")
    expect(state.entries.at(-1)?.event).toBe("event-5")
  })
})
