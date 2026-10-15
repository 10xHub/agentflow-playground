import { beforeEach, describe, expect, it } from "vitest"

import {
  activeScenario,
  DEFAULT_SCENARIO,
  enterDemo,
  exitDemo,
  isDemoActive,
} from "@/lib/demo/demo-mode"

describe("demo-mode", () => {
  beforeEach(() => {
    exitDemo()
    sessionStorage.clear()
    localStorage.clear()
  })

  it("is off by default", () => {
    expect(isDemoActive()).toBe(false)
  })

  it("enters a known scenario", () => {
    expect(enterDemo("support")).toBe("support")
    expect(activeScenario()).toBe("support")
  })

  it("falls back to the default scenario for an unknown id", () => {
    expect(enterDemo("does-not-exist")).toBe(DEFAULT_SCENARIO)
    expect(enterDemo()).toBe(DEFAULT_SCENARIO)
  })

  it("exits", () => {
    enterDemo("support")
    exitDemo()
    expect(isDemoActive()).toBe(false)
  })

  it("never touches localStorage", () => {
    enterDemo("support")
    expect(localStorage.length).toBe(0)
  })
})
