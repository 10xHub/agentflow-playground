import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import RunPicker from "./run-picker"

describe("RunPicker", () => {
  it("lists runs newest first and labels the latest", () => {
    render(<RunPicker runIds={["a", "b", "c"]} current="c" onPick={() => {}} />)
    const opts = screen.getAllByRole("option").map((o) => o.textContent)
    expect(opts).toEqual(["c (latest)", "b", "a"])
  })

  it("calls onPick with the chosen id", () => {
    const onPick = vi.fn()
    render(<RunPicker runIds={["a", "b"]} current="b" onPick={onPick} />)
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "a" } })
    expect(onPick).toHaveBeenCalledWith("a")
  })

  it("renders no combobox for one run", () => {
    render(<RunPicker runIds={["a"]} current="a" onPick={() => {}} />)
    expect(screen.queryByRole("combobox")).toBeNull()
    expect(screen.getByText("1 run")).toBeTruthy()
  })
})
