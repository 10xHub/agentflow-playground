import { configureStore } from "@reduxjs/toolkit"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DemoClient } from "@/lib/demo/demo-client"
import { enterDemo, exitDemo } from "@/lib/demo/demo-mode"
import fixture from "@/lib/demo/test-fixture"
import KeywordNote from "@/pages/memory/components/keyword-note"
import memoryReducer, { searchMemories } from "@/store/memory-slice"

const { current } = vi.hoisted(() => ({ current: { client: null } }))
vi.mock("@/lib/tenxgraph-client", () => ({
  getTenxGraphClient: () => current.client,
}))

const setup = async (query) => {
  current.client = new DemoClient(fixture)
  const store = configureStore({ reducer: { memory: memoryReducer } })
  await store.dispatch(searchMemories(query))
  render(
    <Provider store={store}>
      <KeywordNote />
    </Provider>
  )
  return store
}

describe("KeywordNote", () => {
  beforeEach(() => enterDemo("support"))
  afterEach(() => exitDemo())

  it("stays hidden for the store's own search", async () => {
    await setup("contact preference")
    expect(screen.queryByText(/Keyword match/)).toBeNull()
  })

  it("labels keyword matches and offers the recorded searches", async () => {
    const store = await setup("broken order")
    expect(screen.getByText(/Keyword match/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "contact preference" }))

    await vi.waitFor(() => expect(store.getState().memory.query).toBe("contact preference"))
    expect(store.getState().memory.keywordMatch).toBe(false)
  })

  it("renders nothing once the demo has ended, even with stale state", async () => {
    const store = await setup("broken order")
    expect(store.getState().memory.keywordMatch).toBe(true)
    cleanup()
    exitDemo()
    current.client = {} // a real client has no recordedQueries
    const { container } = render(
      <Provider store={store}>
        <KeywordNote />
      </Provider>
    )
    expect(container).toBeEmptyDOMElement()
  })
})
