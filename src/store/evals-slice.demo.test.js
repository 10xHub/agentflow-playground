import { configureStore } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DemoClient } from "@/lib/demo/demo-client"
import { enterDemo, exitDemo } from "@/lib/demo/demo-mode"
import fixture from "@/lib/demo/test-fixture"
import evalsReducer, { loadEvalRuns } from "@/store/evals-slice"

const { current } = vi.hoisted(() => ({ current: { client: null } }))
vi.mock("@/lib/tenxgraph-client", () => ({
  getTenxGraphClient: () => current.client,
}))

describe("evals in demo mode", () => {
  const realFetch = globalThis.fetch

  beforeEach(() => {
    enterDemo("support")
    current.client = new DemoClient(fixture)
    globalThis.fetch = vi.fn(() => Promise.reject(new Error("no network in demo")))
  })

  afterEach(() => {
    exitDemo()
    globalThis.fetch = realFetch
  })

  it("loads runs and the first run's detail from the recording", async () => {
    const store = configureStore({ reducer: { evals: evalsReducer } })

    await store.dispatch(loadEvalRuns())
    await vi.waitFor(() => expect(store.getState().evals.detail).toBeTruthy())

    const { evals } = store.getState()
    expect(JSON.stringify(evals)).toContain('"r1"')
    expect(evals.detail).toEqual(fixture.evals.detail.r1)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
