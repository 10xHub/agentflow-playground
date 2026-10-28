import { configureStore } from "@reduxjs/toolkit"
import { fireEvent, render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import chatReducer from "@/store/chat-slice"
import threadsReducer, { listLoaded } from "@/store/threads-slice"

import ThreadsPage from "./threads-page"

const { client } = vi.hoisted(() => ({
  client: { threads: vi.fn(), threadState: vi.fn(), threadMessages: vi.fn() },
}))
vi.mock("@/lib/tenxgraph-client", () => ({ getTenxGraphClient: () => client }))

const Where = () => (
  <div data-testid="where">{useLocation().pathname + useLocation().search}</div>
)

describe("ThreadsPage View trace", () => {
  it("opens /trace for the selected thread", () => {
    client.threads.mockResolvedValue({
      data: { threads: [{ thread_id: "a" }] },
    })
    client.threadState.mockResolvedValue({ data: { state: {} } })
    client.threadMessages.mockResolvedValue({ data: { messages: [] } })
    const store = configureStore({
      reducer: { threads: threadsReducer, chat: chatReducer },
    })
    store.dispatch(listLoaded([{ thread_id: "a" }]))
    store.dispatch({ type: "threads/selectThread", payload: "a" })
    render(
      <MemoryRouter initialEntries={["/threads"]}>
        <Provider store={store}>
          <Routes>
            <Route path="/threads" element={<ThreadsPage />} />
            <Route path="/trace" element={<Where />} />
          </Routes>
        </Provider>
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole("button", { name: /View trace/ }))
    expect(screen.getByTestId("where").textContent).toBe("/trace?thread=a")
  })
})
