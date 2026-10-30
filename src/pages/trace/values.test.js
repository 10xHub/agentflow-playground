import { describe, expect, it } from "vitest"

import { bubblesFor, metaRows } from "./values"

describe("bubblesFor", () => {
  it("maps root messages", () => {
    expect(bubblesFor({ user_message: "hi" })).toEqual([
      { role: "user", text: "hi" },
    ])
    expect(bubblesFor({ assistant_message: "yo" })[0].role).toBe("assistant")
  })

  it("maps node messages and the incoming message", () => {
    const m = {
      role: "tool",
      tool_results: [{ call_id: "c", is_error: false }],
    }
    expect(bubblesFor({ incoming_message: m })).toEqual([m])
    expect(
      bubblesFor({ messages: [m, { role: "assistant", text: "x" }] })
    ).toHaveLength(2)
  })

  it("maps an llm output with text", () => {
    const b = bubblesFor({
      text: "ok",
      tool_calls: [{ id: "1", name: "t", args: {} }],
    })
    expect(b[0].text).toBe("ok")
  })

  it("returns null for things that are not messages", () => {
    expect(bubblesFor({ result: 4 })).toBeNull()
    expect(bubblesFor({ args: { a: 1 } })).toBeNull()
    expect(bubblesFor({ messages: [{ foo: 1 }] })).toBeNull()
    expect(bubblesFor(null)).toBeNull()
    expect(bubblesFor("x")).toBeNull()
  })
})

describe("metaRows", () => {
  it("lists only fields the span carries", () => {
    const rows = metaRows({
      id: "s1",
      kind: "llm",
      status: "ok",
      duration_ms: 12.4,
      model: "m",
      input_tokens: 1200,
      reasoning_tokens: 0,
      step: null,
      tool_call_id: "tc",
    })
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    expect(map.model).toBe("m")
    expect(map["input tokens"]).toBe("1,200")
    expect(map["reasoning tokens"]).toBe("0")
    expect(map.tool_call_id).toBe("tc")
    expect(map.step).toBeUndefined()
    expect(map.visit).toBeUndefined()
  })
})
