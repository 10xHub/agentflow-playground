import { configureStore } from "@reduxjs/toolkit"
import { render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import ChatHeader from "@/pages/chat/components/chat-header"
import chatReducer from "@/store/chat-slice"

const { conn } = vi.hoisted(() => ({
  conn: { isConnected: true, isDemo: false },
}))
vi.mock("@/lib/connection/connection-context", () => ({
  useConnection: () => conn,
}))
vi.mock("./thread-picker", () => ({ default: () => null }))

const renderHeader = () =>
  render(
    <Provider store={configureStore({ reducer: { chat: chatReducer } })}>
      <MemoryRouter>
        <ChatHeader />
      </MemoryRouter>
    </Provider>
  )

describe("ChatHeader transport", () => {
  it("ws is selectable on a live server", () => {
    conn.isDemo = false
    renderHeader()
    expect(screen.getByRole("button", { name: "ws" })).not.toBeDisabled()
  })

  it("ws is disabled in the demo with a reason", () => {
    conn.isDemo = true
    renderHeader()
    const ws = screen.getByRole("button", { name: "ws" })
    expect(ws).toBeDisabled()
    expect(ws).toHaveAttribute("title", "Live servers only")
  })
})
