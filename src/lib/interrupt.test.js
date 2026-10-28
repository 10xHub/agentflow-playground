import { describe, expect, it } from "vitest"

import {
  answerPlan,
  interruptFromChunk,
  interruptFromState,
  parseResponse,
  pauseFromChunk,
  pauseFromState,
  remoteToolNames,
  unhandledPause,
} from "@/lib/interrupt"

const open = { id: "i1", node: "gate", message: "Send the email?" }

describe("interruptFromChunk", () => {
  it("reads the interrupt from an interrupted updates chunk", () => {
    const chunk = {
      event: "updates",
      data: { status: "interrupted", interrupt: open },
    }
    expect(interruptFromChunk(chunk)).toEqual(open)
  })

  it("ignores other chunks and pauses without an Interrupt object", () => {
    expect(interruptFromChunk({ event: "message" })).toBeNull()
    expect(
      interruptFromChunk({ event: "updates", data: { status: "done" } })
    ).toBeNull()
    expect(
      interruptFromChunk({ event: "updates", data: { status: "interrupted" } })
    ).toBeNull()
  })
})

describe("interruptFromState", () => {
  const meta = {
    interrupt_reason: "interrupt",
    interrupt_data: { interrupt: open },
  }

  it("finds the pending interrupt in a threadState response", () => {
    expect(
      interruptFromState({ data: { state: { execution_meta: meta } } })
    ).toEqual(open)
    expect(interruptFromState({ execution_meta: meta })).toEqual(open)
  })

  it("returns null for other pauses and clean states", () => {
    expect(
      interruptFromState({
        state: { execution_meta: { interrupt_reason: "remote_tool_call" } },
      })
    ).toBeNull()
    expect(interruptFromState({ state: { context: [] } })).toBeNull()
    expect(interruptFromState(null)).toBeNull()
  })
})

describe("answerPlan", () => {
  const plan = (response_schema) => answerPlan({ ...open, response_schema })

  it("approves with a schema-valid value", () => {
    expect(plan({ type: "boolean" })).toEqual({ kind: "approve", value: true })
    expect(
      plan({ type: "object", properties: { approved: { type: "boolean" } } })
    ).toEqual({ kind: "approve", value: { approved: true } })
    expect(plan({ enum: ["reject", "approve"] })).toEqual({
      kind: "approve",
      value: "approve",
    })
  })

  it("asks for input when no fixed approval fits or there is no schema", () => {
    expect(plan({ type: "string" })).toEqual({ kind: "respond" })
    expect(
      plan({ type: "object", properties: { note: { type: "string" } } })
    ).toEqual({ kind: "respond" })
    expect(plan(undefined)).toEqual({ kind: "respond" })
  })
})

describe("parseResponse", () => {
  it("parses JSON and falls back to text", () => {
    expect(parseResponse('{"a":1}')).toEqual({ a: 1 })
    expect(parseResponse("true")).toBe(true)
    expect(parseResponse("go ahead")).toBe("go ahead")
    expect(parseResponse("  ")).toBeUndefined()
  })
})

const pauseChunk = (pause, node = "WORK") => ({
  event: "updates",
  data: { status: "node_invoked", node, pause },
})

describe("pauseFromChunk", () => {
  it("maps before, after and remote_tool pauses", () => {
    expect(pauseFromChunk(pauseChunk("before"))).toEqual({
      kind: "before",
      node: "WORK",
    })
    expect(pauseFromChunk(pauseChunk("after"))).toEqual({
      kind: "after",
      node: "WORK",
    })
    expect(pauseFromChunk(pauseChunk("remote_tool", "TOOL"))).toEqual({
      kind: "remote_tool",
      node: "TOOL",
    })
  })

  it("leaves interrupt() and ordinary updates to interruptFromChunk", () => {
    expect(pauseFromChunk(pauseChunk("interrupt"))).toBeNull()
    expect(
      pauseFromChunk({ event: "updates", data: { status: "done" } })
    ).toBeNull()
    expect(
      pauseFromChunk({ event: "message", data: { pause: "before" } })
    ).toBeNull()
  })
})

describe("unhandledPause", () => {
  const remote = { kind: "remote_tool", node: "TOOL" }

  it("drops a remote_tool pause the browser already handles", () => {
    expect(unhandledPause(remote, ["pick_color"], () => true)).toBeNull()
  })

  it("names the tools nobody handles", () => {
    expect(unhandledPause(remote, ["a", "b"], (name) => name === "a")).toEqual({
      ...remote,
      tool: "b",
    })
  })

  it("keeps the pause when the tool name is unknown", () => {
    expect(unhandledPause(remote, [], () => true)).toEqual({
      ...remote,
      tool: null,
    })
  })

  it("passes before and after through", () => {
    const before = { kind: "before", node: "WORK" }
    expect(unhandledPause(before, [], () => true)).toBe(before)
    expect(unhandledPause(null, [], () => true)).toBeNull()
  })
})

describe("remoteToolNames", () => {
  it("lists remote_tool_call blocks only", () => {
    expect(
      remoteToolNames({
        content: [
          { type: "text", text: "hi" },
          { type: "remote_tool_call", name: "pick_color" },
          { type: "tool_call", name: "server_tool" },
        ],
      })
    ).toEqual(["pick_color"])
    expect(remoteToolNames(undefined)).toEqual([])
  })
})

describe("pauseFromState", () => {
  const stateOf = (reason, extra = {}) => ({
    state: {
      execution_meta: { interrupt_reason: reason, interrupted_node: "WORK" },
      ...extra,
    },
  })

  it("reads interrupt_before and interrupt_after reasons", () => {
    expect(pauseFromState(stateOf("interrupt_before: WORK"))).toEqual({
      kind: "before",
      node: "WORK",
    })
    expect(pauseFromState(stateOf("interrupt_after: WORK"))).toEqual({
      kind: "after",
      node: "WORK",
    })
  })

  it("reads a client tool wait and its tool from the last message", () => {
    const res = stateOf("remote_tool_call", {
      context: [
        {
          role: "assistant",
          content: [{ type: "remote_tool_call", name: "pick" }],
        },
      ],
    })
    expect(pauseFromState(res)).toEqual({
      kind: "remote_tool",
      node: "WORK",
      tool: "pick",
    })
    expect(pauseFromState(res, () => true)).toBeNull()
  })

  it("ignores interrupt() pauses and clean states", () => {
    expect(pauseFromState(stateOf("interrupt"))).toBeNull()
    expect(pauseFromState({ state: {} })).toBeNull()
    expect(pauseFromState(null)).toBeNull()
  })
})
