import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ConnectionPage from "@/pages/connect/connection-page"

const { conn } = vi.hoisted(() => ({ conn: { saved: [] } }))
vi.mock("@/lib/connection/connection-context", () => ({
  useConnection: () => ({
    status: "idle",
    error: null,
    capabilities: null,
    info: null,
    probe: null,
    saved: conn.saved,
    connect: vi.fn(),
  }),
}))
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }))

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<ConnectionPage />} />
        <Route path="/demo" element={<p>demo route</p>} />
      </Routes>
    </MemoryRouter>
  )

const profile = (id) => ({ id, name: id, backendUrl: `http://${id}:8000` })

describe("ConnectionPage", () => {
  beforeEach(() => {
    conn.saved = [profile("local")]
  })

  it("puts the connect form first", () => {
    renderPage()
    const headings = screen.getAllByRole("heading").map((h) => h.textContent)
    expect(headings[0]).toBe("Point at a deployment")
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })

  it("offers the demo, the install commands and why 10xGraph beside it", () => {
    renderPage()
    expect(screen.getByRole("button", { name: /Explore the recorded demo/ })).toBeInTheDocument()
    expect(screen.getByText(/pip install 10xgraph 10xgraph-api/)).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /builds the production server/ })
    ).toBeInTheDocument()
    expect(screen.getByText(/never repeats a charge or an email/)).toBeInTheDocument()
  })

  it("keeps it while there are two saved connections", () => {
    conn.saved = [profile("local"), profile("staging")]
    renderPage()
    expect(screen.getByRole("button", { name: /Explore the recorded demo/ })).toBeInTheDocument()
  })

  it("shows only the form from three saved connections on", () => {
    conn.saved = [profile("a"), profile("b"), profile("c")]
    renderPage()
    expect(screen.queryByRole("button", { name: /Explore the recorded demo/ })).toBeNull()
    expect(
      screen.queryByRole("heading", { name: /builds the production server/ })
    ).toBeNull()
  })

  it("always links to the demo from the top bar", () => {
    conn.saved = [profile("a"), profile("b"), profile("c")]
    renderPage()
    expect(screen.getByRole("link", { name: "Demo" })).toHaveAttribute("href", "/demo")
  })
})
