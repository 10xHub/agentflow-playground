import { act, render, screen } from "@testing-library/react"

import { Toaster } from "@/components/ui/toaster"

import { notifyError, notifySuccess } from "./notify"

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe("notify", () => {
  it("shows an error toast with the error message", async () => {
    render(<Toaster />)
    act(() =>
      notifyError("Could not delete thread", new Error("403 Forbidden"))
    )
    expect(await screen.findByText("Could not delete thread")).toBeTruthy()
    expect(await screen.findByText("403 Forbidden")).toBeTruthy()
  })

  it("shows a success toast", async () => {
    render(<Toaster />)
    act(() => notifySuccess("Saved", "All good"))
    expect(await screen.findByText("Saved")).toBeTruthy()
  })
})
