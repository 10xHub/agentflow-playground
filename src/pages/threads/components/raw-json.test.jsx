import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import RawJson from "./raw-json"

describe("RawJson", () => {
  it("copies the full pretty JSON and shows Copied", async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })
    const value = { a: 1, b: [1, 2, { c: "x" }] }
    render(<RawJson value={value} />)
    expect(screen.getByText("Copy")).toBeTruthy()
    fireEvent.click(screen.getByLabelText("Copy JSON"))
    expect(writeText).toHaveBeenCalledWith(JSON.stringify(value, null, 2))
    expect(await screen.findByText("Copied")).toBeTruthy()
  })
})
