import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import SpanDetail from "./span-detail"

const llm = {
  id: "l1",
  kind: "llm",
  name: "llm.generate",
  status: "ok",
  model: "gpt-x",
  input_tokens: 10,
  output_tokens: 5,
  total_tokens: 15,
  reasoning_tokens: 2,
  inputs: null,
  outputs: {
    text: "Hello there",
    tool_calls: [{ id: "1", name: "lookup", args: { q: 1 } }],
  },
}

describe("SpanDetail", () => {
  it("shows outputs as a chat bubble plus JSON, and says the prompt is not recorded", () => {
    render(<SpanDetail span={llm} />)
    expect(screen.getByText(/prompt is not recorded/i)).toBeTruthy()
    fireEvent.click(screen.getByRole("tab", { name: "Outputs" }))
    expect(screen.getByText("Hello there", { selector: "div" })).toBeTruthy()
    expect(screen.getByLabelText("Copy JSON")).toBeTruthy()
  })

  it("Metadata tab lists model, tokens and reasoning tokens", () => {
    render(<SpanDetail span={llm} />)
    fireEvent.click(screen.getByRole("tab", { name: "Metadata" }))
    expect(screen.getByText("gpt-x")).toBeTruthy()
    expect(screen.getByText("reasoning tokens")).toBeTruthy()
  })

  it("shows the error prominently when status is error", () => {
    render(
      <SpanDetail
        span={{
          id: "t",
          kind: "tool",
          name: "tool: x",
          status: "error",
          error: "boom",
        }}
      />
    )
    expect(screen.getByRole("alert").textContent).toContain("boom")
  })

  it("copies the JSON", async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })
    render(
      <SpanDetail
        span={{
          id: "t",
          kind: "tool",
          name: "tool: x",
          inputs: { args: { a: 1 } },
        }}
      />
    )
    fireEvent.click(screen.getByLabelText("Copy JSON"))
    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify({ args: { a: 1 } }, null, 2)
    )
  })

  it("renders an old-shape span with no inputs, outputs or status", () => {
    render(
      <SpanDetail
        span={{ id: "s", kind: "node", name: "node: MAIN", duration_ms: 0 }}
      />
    )
    expect(screen.getByText(/No input recorded/)).toBeTruthy()
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
