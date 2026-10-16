import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import AgentSteps, { groupSteps } from "./agent-steps"

const call = (id, name, args = "{}") => ({
  _key: `tool_call:${id}`,
  kind: "tool_call",
  callId: id,
  name,
  code: args,
})
const result = (id, code, extra = {}) => ({
  _key: `tool_result:${id}`,
  kind: "tool_result",
  callId: id,
  name: "result",
  code,
  ...extra,
})
const reasoning = { _key: "reasoning:0", kind: "reasoning", text: "Look it up." }

describe("groupSteps", () => {
  it("pairs each tool call with the result that answers it", () => {
    const steps = groupSteps([
      reasoning,
      call("a", "get_customer_history"),
      call("b", "lookup_order"),
      result("b", "[]"),
      result("a", "{}"),
    ])
    expect(steps.map((s) => s.kind)).toEqual(["reasoning", "tool", "tool"])
    expect(steps[1].result.callId).toBe("a")
    expect(steps[2].result.callId).toBe("b")
  })

  it("pairs blocks cached before callId existed by their keys", () => {
    const old = [
      { _key: "tool_call:x", kind: "tool_call", name: "f", code: "{}" },
      { _key: "tool_result:x", kind: "tool_result", name: "result", code: "1" },
    ]
    const steps = groupSteps(old)
    expect(steps).toHaveLength(1)
    expect(steps[0].result.code).toBe("1")
  })

  it("keeps a result whose call is not in the turn as its own step", () => {
    const steps = groupSteps([result("z", "ok")])
    expect(steps).toEqual([{ kind: "tool", call: null, result: result("z", "ok") }])
  })
})

describe("AgentSteps", () => {
  it("names a finished call and shows its arguments and result when opened", async () => {
    render(
      <AgentSteps
        blocks={[call("a", "lookup_order", '{"order_id":"1043"}'), result("a", '{"total":18}')]}
      />
    )
    const row = screen.getByRole("button", { name: /Ran lookup_order/ })
    expect(row).toHaveTextContent('order_id: "1043"')
    await userEvent.click(row)
    expect(screen.getByText("arguments")).toBeInTheDocument()
    expect(screen.getByText("result")).toBeInTheDocument()
  })

  it("marks a failed call", () => {
    render(
      <AgentSteps blocks={[call("a", "cancel"), result("a", "boom", { isError: true })]} />
    )
    expect(screen.getByRole("button", { name: /Failed to run cancel/ })).toBeInTheDocument()
  })

  it("shows a call without a result as running while the turn streams", () => {
    const { rerender } = render(<AgentSteps blocks={[call("a", "lookup_order")]} streaming />)
    expect(screen.getByRole("button", { name: /Running lookup_order/ })).toBeInTheDocument()
    rerender(<AgentSteps blocks={[call("a", "lookup_order")]} />)
    expect(screen.getByRole("button", { name: /Called lookup_order/ })).toBeInTheDocument()
  })

  it("shows reasoning as thinking until the answer starts", () => {
    const { rerender } = render(<AgentSteps blocks={[reasoning]} streaming />)
    expect(screen.getByRole("button", { name: /Thinking/ })).toBeInTheDocument()
    rerender(<AgentSteps blocks={[reasoning]} streaming answering />)
    expect(screen.getByRole("button", { name: /Thought/ })).toBeInTheDocument()
  })
})
