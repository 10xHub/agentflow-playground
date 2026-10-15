import { configureStore } from "@reduxjs/toolkit"
import { fireEvent, render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { describe, expect, it, vi } from "vitest"

import { DemoClient } from "@/lib/demo/demo-client"
import fixture from "@/lib/demo/test-fixture"
import DemoPrompts from "@/pages/chat/components/demo-prompts"
import chatReducer from "@/store/chat-slice"

const { current } = vi.hoisted(() => ({ current: { client: null } }))
vi.mock("@/lib/tenxgraph-client", () => ({
  getTenxGraphClient: () => current.client,
}))
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }))

const renderPrompts = () => {
  current.client = new DemoClient(fixture, { sleep: () => Promise.resolve() })
  const store = configureStore({
    reducer: { chat: chatReducer },
    middleware: (gdm) => gdm({ serializableCheck: false }),
  })
  render(
    <Provider store={store}>
      <DemoPrompts />
    </Provider>
  )
  return store
}

describe("DemoPrompts", () => {
  it("offers the runs that can play now", () => {
    renderPrompts()
    expect(screen.getByRole("button", { name: "First" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Second" })).toBeNull()
  })

  it("plays a run and unlocks the next one", async () => {
    renderPrompts()
    fireEvent.click(screen.getByRole("button", { name: "First" }))
    expect(await screen.findByRole("button", { name: "Second" })).toBeInTheDocument()
  })

  it("points to running it yourself when every run has played", async () => {
    renderPrompts()
    fireEvent.click(screen.getByRole("button", { name: "First" }))
    fireEvent.click(await screen.findByRole("button", { name: "Second" }))
    expect(await screen.findByText(/pip install 10xgraph 10xgraph-api/)).toBeInTheDocument()
  })
})
