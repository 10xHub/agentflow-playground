import { describe, expect, it } from "vitest"

import reducer, { addUserMessage, replaceThreads } from "@/store/chat-slice"

const empty = { order: [], byId: {}, activeId: null }

describe("chat-slice replaceThreads", () => {
  it("swaps the thread cache and clears the active view", () => {
    let state = reducer(undefined, { type: "init" })
    state = reducer(state, addUserMessage({ id: "u1", text: "hi", time: "now" }))

    state = reducer(state, replaceThreads(empty))

    expect(state.threads).toEqual({ order: [], byId: {} })
    expect(state.messages).toEqual([])
    expect(state.threadId).toBeNull()
  })

  it("restores a saved cache", () => {
    const msg = { id: "u1", role: "user", text: "hi" }
    const saved = { order: ["t1"], byId: { t1: { id: "t1", messages: [msg] } }, activeId: "t1" }
    const state = reducer(reducer(undefined, { type: "init" }), replaceThreads(saved))
    expect(state.threads).toEqual({ order: saved.order, byId: saved.byId })
    expect(state.messages).toEqual([msg])
    expect(state.threadId).toBe("t1")
  })
})
