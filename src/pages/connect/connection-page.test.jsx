import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ConnectionPage from "@/pages/connect/connection-page"

const { conn, lna } = vi.hoisted(() => ({
  conn: { saved: [], status: "idle", connect: null, error: null },
  lna: { localPage: false, permission: null, probe: null },
}))
vi.mock("@/lib/connection/connection-context", () => ({
  useConnection: () => ({
    status: conn.status,
    error: conn.error,
    capabilities: conn.status === "connected" ? [] : null,
    info: null,
    probe: null,
    saved: conn.saved,
    connect: conn.connect,
  }),
}))
vi.mock("@/lib/connection/local-network", async (importOriginal) => ({
  ...(await importOriginal()),
  isLocalPage: () => lna.localPage,
  probeLocalNetwork: (...a) => lna.probe(...a),
  queryLocalNetworkPermission: () => Promise.resolve(lna.permission),
}))
vi.mock("@/lib/usage-events", () => ({ track: vi.fn() }))

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<ConnectionPage />} />
        <Route path="/demo" element={<p>demo route</p>} />
        <Route path="/chat" element={<p>chat route</p>} />
      </Routes>
    </MemoryRouter>
  )

const profile = (id) => ({ id, name: id, backendUrl: `http://${id}:8000` })

describe("ConnectionPage", () => {
  beforeEach(() => {
    conn.saved = [profile("local")]
    conn.status = "idle"
    conn.error = null
    conn.connect = vi.fn().mockResolvedValue({ ok: true })
    lna.localPage = false
    lna.permission = null
    lna.probe = vi.fn().mockResolvedValue("ok")
    localStorage.clear()
  })

  it("puts the connect form first", () => {
    renderPage()
    const headings = screen.getAllByRole("heading").map((h) => h.textContent)
    expect(headings[0]).toBe("Point at a deployment")
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })

  it("offers the demo, the install commands and why 10xGraph beside it", () => {
    renderPage()
    expect(
      screen.getByRole("button", { name: /Explore the recorded demo/ })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/pip install 10xgraph 10xgraph-api/)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /builds the production server/ })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/never repeats a charge or an email/)
    ).toBeInTheDocument()
  })

  it("keeps it while there are two saved connections", () => {
    conn.saved = [profile("local"), profile("staging")]
    renderPage()
    expect(
      screen.getByRole("button", { name: /Explore the recorded demo/ })
    ).toBeInTheDocument()
  })

  it("shows only the form from three saved connections on", () => {
    conn.saved = [profile("a"), profile("b"), profile("c")]
    renderPage()
    expect(
      screen.queryByRole("button", { name: /Explore the recorded demo/ })
    ).toBeNull()
    expect(
      screen.queryByRole("heading", { name: /builds the production server/ })
    ).toBeNull()
  })

  it("always links to the demo from the top bar", () => {
    conn.saved = [profile("a"), profile("b"), profile("c")]
    renderPage()
    expect(screen.getByRole("link", { name: "Demo" })).toHaveAttribute(
      "href",
      "/demo"
    )
  })

  describe("two-state connect button", () => {
    // The mocked context cannot flip status itself, so rerender after connect.
    const verify = async () => {
      const view = renderPage()
      fireEvent.click(screen.getByRole("button", { name: "Connect & verify" }))
      await waitFor(() => expect(conn.connect).toHaveBeenCalled())
      conn.status = "connected"
      view.rerender(
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<ConnectionPage />} />
            <Route path="/chat" element={<p>chat route</p>} />
          </Routes>
        </MemoryRouter>
      )
      return view
    }

    it("is not verified when already connected on mount", () => {
      conn.status = "connected"
      renderPage()
      expect(
        screen.getByRole("button", { name: "Connect & verify" })
      ).toBeInTheDocument()
      expect(screen.getByText(/to connect/)).toBeInTheDocument()
    })

    it("turns into Enter playground after a successful connect", async () => {
      await verify()
      const btn = await screen.findByRole("button", {
        name: /enter playground/i,
      })
      expect(btn).toHaveTextContent("Verified")
      expect(screen.getByText(/to enter/)).toBeInTheDocument()
      fireEvent.click(btn)
      expect(await screen.findByText("chat route")).toBeInTheDocument()
    })

    it("reverts when a field is edited after verifying", async () => {
      await verify()
      await screen.findByRole("button", { name: /enter playground/i })
      fireEvent.change(screen.getByLabelText(/Base URL/), {
        target: { value: "http://other:9000" },
      })
      expect(
        screen.getByRole("button", { name: "Connect & verify" })
      ).toBeInTheDocument()
    })

    it("Enter key navigates when verified", async () => {
      await verify()
      await screen.findByRole("button", { name: /enter playground/i })
      conn.connect.mockClear()
      fireEvent.keyDown(document, { key: "Enter" })
      expect(await screen.findByText("chat route")).toBeInTheDocument()
      expect(conn.connect).not.toHaveBeenCalled()
    })
  })

  describe("local network access", () => {
    const setUrl = (value) =>
      fireEvent.change(screen.getByLabelText(/Base URL/), {
        target: { value },
      })

    it("probes a local URL once from a public page", async () => {
      const view = renderPage()
      await waitFor(() => expect(lna.probe).toHaveBeenCalledTimes(1))
      expect(lna.probe).toHaveBeenCalledWith("http://localhost:8000")
      view.rerender(
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<ConnectionPage />} />
          </Routes>
        </MemoryRouter>
      )
      expect(lna.probe).toHaveBeenCalledTimes(1)
    })

    it("does not probe a remote saved URL", async () => {
      localStorage.setItem(
        "10xgraph.settings",
        JSON.stringify({ backendUrl: "https://api.example.com" })
      )
      renderPage()
      await Promise.resolve()
      expect(lna.probe).not.toHaveBeenCalled()
    })

    it("does not probe when the page itself is on localhost", async () => {
      lna.localPage = true
      renderPage()
      await Promise.resolve()
      expect(lna.probe).not.toHaveBeenCalled()
    })

    it("shows the hint when the early probe is blocked", async () => {
      lna.probe = vi.fn().mockResolvedValue("blocked")
      renderPage()
      expect(
        await screen.findByText("Your browser blocked the local server")
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "Try again" })
      ).toBeInTheDocument()
    })

    it("shows the hint at once when the permission is denied", async () => {
      lna.permission = "denied"
      renderPage()
      expect(
        await screen.findByText("Your browser blocked the local server")
      ).toBeInTheDocument()
      expect(lna.probe).not.toHaveBeenCalled()
    })

    it("shows the hint when connecting to a local URL fails on the network", async () => {
      conn.connect = vi.fn().mockResolvedValue({
        ok: false,
        error: new TypeError("Failed to fetch"),
      })
      const view = renderPage()
      fireEvent.click(screen.getByRole("button", { name: "Connect & verify" }))
      await waitFor(() => expect(conn.connect).toHaveBeenCalled())
      conn.status = "error"
      conn.error =
        "Could not reach http://localhost:8000 — is the server running? (network or CORS)"
      view.rerender(
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<ConnectionPage />} />
          </Routes>
        </MemoryRouter>
      )
      expect(
        await screen.findByText("Your browser blocked the local server")
      ).toBeInTheDocument()
      expect(screen.queryByText("Connection failed")).toBeNull()
    })

    it("keeps the old message for a remote URL", async () => {
      conn.connect = vi.fn().mockResolvedValue({
        ok: false,
        error: new TypeError("Failed to fetch"),
      })
      const view = renderPage()
      setUrl("https://api.example.com")
      fireEvent.click(screen.getByRole("button", { name: "Connect & verify" }))
      await waitFor(() => expect(conn.connect).toHaveBeenCalled())
      conn.status = "error"
      conn.error =
        "Could not reach https://api.example.com — is the server running? (network or CORS)"
      view.rerender(
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<ConnectionPage />} />
          </Routes>
        </MemoryRouter>
      )
      expect(
        await screen.findByText(/is the server running/)
      ).toBeInTheDocument()
      expect(
        screen.queryByText("Your browser blocked the local server")
      ).toBeNull()
    })
  })
})
