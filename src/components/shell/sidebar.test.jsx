import { configureStore } from "@reduxjs/toolkit"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import threadsReducer from "@/store/threads-slice"

import Sidebar from "./sidebar"

const { client, conn } = vi.hoisted(() => ({
  client: { threads: vi.fn(), threadState: vi.fn(), threadMessages: vi.fn() },
  conn: { isConnected: true, isDemo: false },
}))
vi.mock("@/lib/tenxgraph-client", () => ({ getTenxGraphClient: () => client }))
vi.mock("@/lib/connection/connection-context", () => ({
  useConnection: () => conn,
}))

const renderSidebar = ({
  collapsed = false,
  onToggleCollapse = () => {},
} = {}) => {
  const store = configureStore({ reducer: { threads: threadsReducer } })
  render(
    <Provider store={store}>
      <MemoryRouter>
        <Sidebar collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </MemoryRouter>
    </Provider>
  )
  return store
}

beforeEach(() => {
  vi.clearAllMocks()
  client.threads.mockResolvedValue({
    data: {
      threads: [{ thread_id: "a" }, { thread_id: "b" }, { thread_id: "c" }],
    },
  })
})

describe("Sidebar threads badge", () => {
  it("populates at startup without loading a thread", async () => {
    conn.isConnected = true
    conn.isDemo = false
    renderSidebar()
    await waitFor(() => expect(screen.getByText("3")).toBeTruthy())
    expect(client.threadState).not.toHaveBeenCalled()
  })

  it("populates in demo mode", async () => {
    conn.isConnected = true
    conn.isDemo = true
    renderSidebar()
    await waitFor(() => expect(screen.getByText("3")).toBeTruthy())
  })

  it("does not load while disconnected", () => {
    conn.isConnected = false
    conn.isDemo = false
    renderSidebar()
    expect(client.threads).not.toHaveBeenCalled()
  })
})

describe("Sidebar collapse toggle", () => {
  it("is labelled Collapse sidebar when expanded and calls the handler", () => {
    const onToggleCollapse = vi.fn()
    renderSidebar({ onToggleCollapse })
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }))
    expect(onToggleCollapse).toHaveBeenCalledTimes(1)
  })

  it("is labelled Expand sidebar when collapsed", () => {
    renderSidebar({ collapsed: true })
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeTruthy()
    expect(
      screen.queryByRole("button", { name: "Collapse sidebar" })
    ).toBeNull()
  })
})
