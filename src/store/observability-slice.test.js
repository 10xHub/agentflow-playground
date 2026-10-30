import { configureStore } from "@reduxjs/toolkit"
import { describe, expect, it, vi } from "vitest"

import reducer, { loadObservability } from "./observability-slice"

const { client } = vi.hoisted(() => ({ client: { observability: vi.fn() } }))
vi.mock("@/lib/tenxgraph-client", () => ({ getTenxGraphClient: () => client }))

describe("observability slice", () => {
  it("a 404 with statusCode and no message match is treated as empty", async () => {
    client.observability.mockRejectedValue({ statusCode: 404, message: "x" })
    const store = configureStore({ reducer: { o: reducer } })
    await store.dispatch(loadObservability("t1"))
    expect(store.getState().o.status).toBe("empty")
  })
})

describe("observability slice enabled/reason", () => {
  const load = async (payload) => {
    client.observability.mockResolvedValue({ data: payload })
    const store = configureStore({ reducer: { o: reducer } })
    await store.dispatch(loadObservability("t1"))
    return store.getState().o
  }

  it("keeps enabled and reason from the payload", async () => {
    const s = await load({
      thread_id: "t1",
      enabled: false,
      reason: "disabled_in_production",
      run: null,
    })
    expect(s).toMatchObject({
      status: "empty",
      enabled: false,
      reason: "disabled_in_production",
    })
  })

  it("older payloads without the fields count as enabled, no_runs when empty", async () => {
    const s = await load({ thread_id: "t1", run: null })
    expect(s).toMatchObject({ enabled: true, reason: "no_runs" })
  })

  it("a run clears the reason", async () => {
    const s = await load({
      thread_id: "t1",
      enabled: true,
      reason: null,
      run: { run_id: "r", spans: [] },
    })
    expect(s).toMatchObject({ status: "ready", reason: null })
  })
})
