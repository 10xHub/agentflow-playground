import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import FacetsColumn from "./facets-column"

describe("FacetsColumn", () => {
  it("shows a read-only collection row and no text input", () => {
    render(
      <FacetsColumn
        loaded="0 / 0"
        types={new Set()}
        typeCounts={[]}
        onToggleType={vi.fn()}
        onAllTypes={vi.fn()}
        catCounts={[]}
        onSetCat={vi.fn()}
        onReload={vi.fn()}
      />
    )
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(screen.getByText("set in code")).toBeTruthy()
  })

  it("sends the min score to the caller while searching", () => {
    const onMinScore = vi.fn()
    render(
      <FacetsColumn
        loaded="0 / 0"
        types={new Set()}
        typeCounts={[]}
        onToggleType={vi.fn()}
        onAllTypes={vi.fn()}
        catCounts={[]}
        onSetCat={vi.fn()}
        onReload={vi.fn()}
        searching
        minScore={0.2}
        onMinScore={onMinScore}
      />
    )
    fireEvent.change(screen.getByLabelText("Minimum score"), {
      target: { value: "0.5" },
    })
    expect(onMinScore).toHaveBeenCalledWith(0.5)
  })

  it("disables the min score outside search", () => {
    render(
      <FacetsColumn
        loaded="0 / 0"
        types={new Set()}
        typeCounts={[]}
        onToggleType={vi.fn()}
        onAllTypes={vi.fn()}
        catCounts={[]}
        onSetCat={vi.fn()}
        onReload={vi.fn()}
        onMinScore={vi.fn()}
      />
    )
    expect(screen.getByLabelText("Minimum score").disabled).toBe(true)
  })
})
