import { describe, expect, it } from "vitest"

import reducer, {
  startRun,
  accumulateRunUsage,
  bumpRunToolCount,
  setRunFinalMessage,
  finishRun,
  clearRuns,
  selectLatestRun,
  selectRunHistory,
  selectRunByFinalMessageId,
} from "./runs.slice"
import ct from "@constants/"

const usage = (overrides = {}) => ({
  prompt_tokens: 100,
  completion_tokens: 40,
  total_tokens: 140,
  reasoning_tokens: 10,
  ...overrides,
})

const wrap = (runsState) => ({ [ct.store.RUNS_STORE]: runsState })

describe("runs.slice", () => {
  it("starts a run as the latest for its thread", () => {
    const state = reducer(
      undefined,
      startRun({ runId: "r1", threadId: "t1", mode: "invoke", startedAt: 1000 })
    )

    expect(state.order).toEqual(["r1"])
    expect(state.byId.r1.status).toBe("running")
    expect(state.latestByThread.t1).toBe("r1")
    expect(selectLatestRun(wrap(state), "t1").id).toBe("r1")
  })

  it("aggregates token usage across messages", () => {
    let state = reducer(undefined, startRun({ runId: "r1", threadId: "t1" }))
    state = reducer(
      state,
      accumulateRunUsage({ runId: "r1", messageId: "m1", usages: usage() })
    )
    state = reducer(
      state,
      accumulateRunUsage({
        runId: "r1",
        messageId: "m2",
        usages: usage({ prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }),
      })
    )

    expect(state.byId.r1.tokens.prompt).toBe(150)
    expect(state.byId.r1.tokens.completion).toBe(60)
    expect(state.byId.r1.tokens.total).toBe(210)
    expect(state.byId.r1.tokens.reasoning).toBe(20)
  })

  it("dedupes usage by message id so snapshots never double-count", () => {
    let state = reducer(undefined, startRun({ runId: "r1", threadId: "t1" }))
    state = reducer(
      state,
      accumulateRunUsage({ runId: "r1", messageId: "m1", usages: usage() })
    )
    // Same message id resent (streamed snapshot) — latest wins, not added.
    state = reducer(
      state,
      accumulateRunUsage({
        runId: "r1",
        messageId: "m1",
        usages: usage({ total_tokens: 140 }),
      })
    )

    expect(state.byId.r1.tokens.total).toBe(140)
  })

  it("ignores empty or missing usage objects", () => {
    let state = reducer(undefined, startRun({ runId: "r1", threadId: "t1" }))
    state = reducer(
      state,
      accumulateRunUsage({ runId: "r1", messageId: "m1", usages: null })
    )
    state = reducer(
      state,
      accumulateRunUsage({
        runId: "r1",
        messageId: "m2",
        usages: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      })
    )

    expect(state.byId.r1.tokens.total).toBe(0)
  })

  it("finishes a run with duration and explicit iterations", () => {
    let state = reducer(
      undefined,
      startRun({ runId: "r1", threadId: "t1", startedAt: 1000 })
    )
    state = reducer(
      state,
      finishRun({
        runId: "r1",
        threadId: "t1",
        status: "done",
        finishedAt: 3500,
        iterations: 3,
        toolCallCount: 2,
      })
    )

    expect(state.byId.r1.status).toBe("done")
    expect(state.byId.r1.durationMs).toBe(2500)
    expect(state.byId.r1.iterations).toBe(3)
    expect(state.byId.r1.toolCallCount).toBe(2)
  })

  it("falls back to model-call count for stream iterations", () => {
    let state = reducer(undefined, startRun({ runId: "r1", threadId: "t1" }))
    state = reducer(
      state,
      accumulateRunUsage({ runId: "r1", messageId: "m1", usages: usage() })
    )
    state = reducer(
      state,
      accumulateRunUsage({ runId: "r1", messageId: "m2", usages: usage() })
    )
    state = reducer(state, finishRun({ runId: "r1", status: "done" }))

    expect(state.byId.r1.iterations).toBe(2)
  })

  it("re-keys latestByThread when the thread id resolves mid-run", () => {
    let state = reducer(
      undefined,
      startRun({ runId: "r1", threadId: "temp", startedAt: 1000 })
    )
    state = reducer(
      state,
      finishRun({
        runId: "r1",
        threadId: "server-id",
        status: "done",
        finishedAt: 1100,
      })
    )

    expect(state.byId.r1.threadId).toBe("server-id")
    expect(state.latestByThread["server-id"]).toBe("r1")
    expect(state.latestByThread.temp).toBeUndefined()
  })

  it("tracks tool call bumps", () => {
    let state = reducer(undefined, startRun({ runId: "r1", threadId: "t1" }))
    state = reducer(state, bumpRunToolCount({ runId: "r1", count: 1 }))
    state = reducer(state, bumpRunToolCount({ runId: "r1" }))

    expect(state.byId.r1.toolCallCount).toBe(2)
  })

  it("looks up a finished run by its final message id", () => {
    let state = reducer(undefined, startRun({ runId: "r1", threadId: "t1" }))
    state = reducer(
      state,
      setRunFinalMessage({ runId: "r1", finalMessageId: "m1:text" })
    )

    // Running runs are not matched.
    expect(selectRunByFinalMessageId(wrap(state), "m1:text")).toBeNull()

    state = reducer(state, finishRun({ runId: "r1", status: "done" }))
    expect(selectRunByFinalMessageId(wrap(state), "m1:text").id).toBe("r1")
  })

  it("returns run history newest first and clears", () => {
    let state = reducer(undefined, startRun({ runId: "r1", threadId: "t1" }))
    state = reducer(state, startRun({ runId: "r2", threadId: "t1" }))

    expect(selectRunHistory(wrap(state), "t1").map((r) => r.id)).toEqual([
      "r2",
      "r1",
    ])

    state = reducer(state, clearRuns())
    expect(state.order).toEqual([])
  })
})
