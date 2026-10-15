import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { enterDemo, exitDemo } from "@/lib/demo/demo-mode"
import { loadThreads, saveThreads } from "@/store/threads-cache"

const KEY = "10xgraph.threads"
const saved = { order: ["mine"], byId: { mine: { id: "mine" } }, activeId: "mine" }

describe("threads-cache in demo mode", () => {
  beforeEach(() => {
    localStorage.clear()
    enterDemo("support")
  })

  afterEach(() => {
    exitDemo()
  })

  it("does not write the visitor's thread cache", () => {
    saveThreads({ order: ["x"], byId: { x: {} }, activeId: "x" })
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it("does not show the visitor's real threads", () => {
    localStorage.setItem(KEY, JSON.stringify(saved))
    expect(loadThreads()).toEqual({ order: [], byId: {}, activeId: null })
  })

  it("still persists outside demo mode", () => {
    exitDemo()
    saveThreads(saved)
    expect(loadThreads()).toEqual(saved)
  })
})
