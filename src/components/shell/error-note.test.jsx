import { fireEvent, render, screen } from "@testing-library/react"

import ErrorNote from "./error-note"

describe("ErrorNote", () => {
  it("renders the message as an alert without Retry by default", () => {
    render(<ErrorNote message="Load failed" />)
    expect(screen.getByRole("alert").textContent).toContain("Load failed")
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull()
  })

  it("calls onRetry once on click", () => {
    const onRetry = vi.fn()
    render(<ErrorNote message="x" onRetry={onRetry} />)
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
