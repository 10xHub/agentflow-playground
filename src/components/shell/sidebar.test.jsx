import { configureStore } from "@reduxjs/toolkit"
import { render, screen, waitFor } from "@testing-library/react"
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

const renderSidebar = () => {
  const store = configureStore({ reducer: { threads: threadsReducer } })
  render(
    <Provider store={store}>
      <MemoryRouter>
        <Sidebar collapsed={false} onToggleCollapse={() => {}} />
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
