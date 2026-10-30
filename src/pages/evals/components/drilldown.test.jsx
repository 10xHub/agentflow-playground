import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import Drilldown from "./drilldown"

const detail = {
  name: "suite",
  run: "r1",
  rate: 80,
  threshold: 70,
  stats: [],
  cases: [{ id: "c1", name: "case one", score: 0.9, status: "pass" }],
  regression: [],
}

const renderIt = (onDownload) =>
  render(
    <Drilldown
      detail={detail}
      tab="cases"
      onTab={vi.fn()}
      selectedCaseId="c1"
      onSelectCase={vi.fn()}
      onDownload={onDownload}
    />
  )

describe("Drilldown", () => {
  it("has no Download HTML report button", () => {
    renderIt()
    expect(screen.queryByText(/Download HTML report/i)).toBeNull()
  })

  it("the score threshold label uses the run threshold", () => {
    renderIt()
    expect(screen.getByText(/threshold 0\.7$/)).toBeTruthy()
  })

  it("downloads the open run from the Download report button", () => {
    const onDownload = vi.fn()
    renderIt(onDownload)
    fireEvent.click(screen.getByRole("button", { name: /Download report/ }))
    expect(onDownload).toHaveBeenCalled()
  })

  it("hides Download report without a handler", () => {
    renderIt()
    expect(screen.queryByRole("button", { name: /Download report/ })).toBeNull()
  })
})
