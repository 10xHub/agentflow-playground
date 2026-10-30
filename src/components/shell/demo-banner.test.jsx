import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import DemoBanner from "@/components/shell/demo-banner"
import { store } from "@/store"

const connection = { isDemo: true, disconnect: vi.fn() }
vi.mock("@/lib/connection/connection-context", () => ({
  useConnection: () => connection,
}))

const renderAt = (path) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<p>connect page</p>} />
          <Route path="*" element={<DemoBanner />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  )

describe("DemoBanner", () => {
  beforeEach(() => {
    connection.isDemo = true
    connection.disconnect.mockClear()
  })

  it("says the data is recorded and the replies are scripted", () => {
    renderAt("/chat")
    expect(screen.getByText(/Recorded demo/)).toBeInTheDocument()
    expect(screen.getByText(/scripted/)).toBeInTheDocument()
  })

  it("shows the callout for the current screen", () => {
    renderAt("/memory")
    expect(screen.getByText(/saved with its memory tool/)).toBeInTheDocument()
  })

  it("exits the demo back to the connect page", () => {
    renderAt("/memory")
    fireEvent.click(screen.getByRole("button", { name: /Exit demo/ }))
    expect(connection.disconnect).toHaveBeenCalledOnce()
    expect(screen.getByText("connect page")).toBeInTheDocument()
  })

  it("opens the demo agent's source", async () => {
    renderAt("/graph")
    fireEvent.click(screen.getByRole("button", { name: /View agent source/ }))
    // The sheet and the source are lazy chunks, slower under a parallel test run.
    const slow = { timeout: 5000 }
    const dialog = await screen.findByRole(
      "dialog",
      { name: "demo/agent/graph.py" },
      slow
    )
    await waitFor(
      () =>
        expect(dialog.textContent).toContain(
          "graph.compile(checkpointer=checkpointer"
        ),
      slow
    )
  })

  it("renders nothing outside the demo", () => {
    connection.isDemo = false
    const { container } = renderAt("/chat")
    expect(container).toBeEmptyDOMElement()
  })
})
