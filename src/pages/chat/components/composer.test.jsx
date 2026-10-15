import { configureStore } from "@reduxjs/toolkit"
import { render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { describe, expect, it, vi } from "vitest"

import Composer from "@/pages/chat/components/composer"
import chatReducer from "@/store/chat-slice"

const { conn } = vi.hoisted(() => ({ conn: { isConnected: true, isDemo: false } }))
vi.mock("@/lib/connection/connection-context", () => ({ useConnection: () => conn }))

const renderComposer = () => {
  const store = configureStore({ reducer: { chat: chatReducer } })
  render(
    <Provider store={store}>
      <Composer />
    </Provider>
  )
}

describe("Composer", () => {
  it("accepts free text on a live server", () => {
    conn.isDemo = false
    renderComposer()
    expect(screen.getByRole("textbox")).not.toBeDisabled()
  })

  it("locks free text in the recorded demo", () => {
    conn.isDemo = true
    renderComposer()
    const box = screen.getByRole("textbox")
    expect(box).toBeDisabled()
    expect(box).toHaveAttribute("placeholder", "Recorded demo: pick a prompt above")
  })
})
