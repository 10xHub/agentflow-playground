import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import RunList from "./run-list"

describe("RunList", () => {
  it("shows a load error inline", () => {
    render(
      <RunList
        runs={[]}
        error="x.json is not valid JSON."
        onSelect={vi.fn()}
        onOpen={vi.fn()}
      />
    )
    expect(screen.getByRole("alert").textContent).toContain(
      "x.json is not valid JSON."
    )
  })

  it("tells the user to run 10xgraph eval and open the JSON when empty", () => {
    render(<RunList runs={[]} onSelect={vi.fn()} onOpen={vi.fn()} />)
    expect(screen.getByText(/Run 10xgraph eval/)).toBeTruthy()
    expect(screen.getByText(/eval_reports\//)).toBeTruthy()
  })

  it('does not say "connect to a backend"', () => {
    render(<RunList runs={[]} onSelect={vi.fn()} onOpen={vi.fn()} />)
    expect(screen.queryByText(/connect to a backend/i)).toBeNull()
  })

  it("shows an errors count on runs that have errored cases", () => {
    render(
      <RunList
        runs={[
          {
            id: "a",
            name: "A",
            run: "#1",
            rate: 50,
            status: "fail",
            cases: 4,
            errors: 2,
            ago: "1m ago",
          },
          {
            id: "b",
            name: "B",
            run: "#2",
            rate: 100,
            status: "pass",
            cases: 2,
            errors: 0,
            ago: "2m ago",
          },
        ]}
        onSelect={vi.fn()}
        onOpen={vi.fn()}
      />
    )
    expect(screen.getByText("· 2 errors")).toBeTruthy()
    expect(screen.getAllByText(/errors?$/)).toHaveLength(1)
  })

  it("has an Open report file button", () => {
    const onOpen = vi.fn()
    render(<RunList runs={[]} onSelect={vi.fn()} onOpen={onOpen} />)
    fireEvent.click(screen.getByRole("button", { name: /Open report file/ }))
    expect(onOpen).toHaveBeenCalled()
  })

  it("offers the sample only when a handler is given", () => {
    const onSample = vi.fn()
    const { rerender } = render(
      <RunList runs={[]} onSelect={vi.fn()} onOpen={vi.fn()} />
    )
    expect(
      screen.queryByRole("button", { name: "Load sample report" })
    ).toBeNull()
    rerender(
      <RunList
        runs={[]}
        onSelect={vi.fn()}
        onOpen={vi.fn()}
        onSample={onSample}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Load sample report" }))
    expect(onSample).toHaveBeenCalled()
  })
})
