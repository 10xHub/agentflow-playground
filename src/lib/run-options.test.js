import { describe, expect, it } from "vitest"

import { resolveRunOptions, summariseRunOptions } from "./run-options"

const opts = (o) => ({ initialState: "", config: "", recursionLimit: "", ...o })

describe("resolveRunOptions", () => {
  it("sends nothing extra when all fields are blank", () => {
    const r = resolveRunOptions(opts(), "t_123")
    expect(r.valid).toBe(true)
    expect(r.initial_state).toBeUndefined()
    expect(r.recursion_limit).toBeUndefined()
    expect(r.config).toEqual({ thread_id: "t_123" })
  })

  it("omits thread_id on a draft thread", () => {
    expect(resolveRunOptions(opts(), null).config).toEqual({})
  })

  it("merges config over thread_id without dropping it", () => {
    const r = resolveRunOptions(opts({ config: '{"user_id":"u1"}' }), "t_123")
    expect(r.config).toEqual({ thread_id: "t_123", user_id: "u1" })
  })

  it("lets an explicit thread_id win", () => {
    const r = resolveRunOptions(
      opts({ config: '{"thread_id":"forced"}' }),
      "t_123"
    )
    expect(r.config.thread_id).toBe("forced")
  })

  it("passes initial_state and recursion_limit through", () => {
    const r = resolveRunOptions(
      opts({ initialState: '{"a":1}', recursionLimit: "50" }),
      null
    )
    expect(r.initial_state).toEqual({ a: 1 })
    expect(r.recursion_limit).toBe(50)
  })

  it("reports malformed json instead of silently dropping it", () => {
    const r = resolveRunOptions(opts({ initialState: "{broken" }), null)
    expect(r.valid).toBe(false)
    expect(r.errors.initialState).toBeTruthy()
  })

  it("rejects non-object json and bad limits", () => {
    expect(
      resolveRunOptions(opts({ config: "[1,2]" }), null).errors.config
    ).toBe("must be a JSON object")
    expect(
      resolveRunOptions(opts({ recursionLimit: "0" }), null).errors
        .recursionLimit
    ).toBeTruthy()
    expect(
      resolveRunOptions(opts({ recursionLimit: "abc" }), null).errors
        .recursionLimit
    ).toBeTruthy()
  })
})

describe("summariseRunOptions", () => {
  it("is null when nothing is set", () => {
    expect(summariseRunOptions(opts())).toBeNull()
  })

  it("counts keys and flags invalid input", () => {
    expect(summariseRunOptions(opts({ initialState: '{"a":1,"b":2}' }))).toBe(
      "initial_state 2"
    )
    expect(summariseRunOptions(opts({ recursionLimit: "50" }))).toBe(
      "recursion 50"
    )
    expect(summariseRunOptions(opts({ config: "{oops" }))).toBe(
      "config invalid"
    )
  })
})
