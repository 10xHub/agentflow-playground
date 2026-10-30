import { describe, expect, it } from "vitest"

import { initialLiveState, liveReducer } from "./live-events"

const chunk = (role, text, finished = false) => ({
  type: "transcript",
  role,
  text,
  finished,
})

const run = (actions) => actions.reduce(liveReducer, initialLiveState)

describe("live transcript", () => {
  it("a finished event with the whole text replaces the streamed chunks", () => {
    const state = run([
      chunk("agent", "It is "),
      chunk("agent", "sunny."),
      chunk("agent", "It is sunny.", true),
    ])
    expect(state.messages.map((m) => [m.role, m.text, m.done])).toEqual([
      ["agent", "It is sunny.", true],
    ])
  })

  it("an empty finished marker keeps the streamed text", () => {
    const state = run([
      chunk("user", "hi "),
      chunk("user", "there"),
      chunk("user", "", true),
    ])
    expect(state.messages.map((m) => m.text)).toEqual(["hi there"])
  })

  it("a finished event with no streamed chunks adds the bubble", () => {
    const state = run([chunk("user", "hello", true)])
    expect(state.messages.map((m) => [m.text, m.done])).toEqual([
      ["hello", true],
    ])
  })
})
