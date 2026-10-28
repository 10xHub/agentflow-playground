import { configureStore } from "@reduxjs/toolkit"
import { fireEvent, render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import chatReducer from "@/store/chat-slice"
import threadsReducer, { listLoaded } from "@/store/threads-slice"

import ThreadsPage from "./threads-page"

const { client } = vi.hoisted(() => ({
  client: {
    threads: vi.fn(),
    threadState: vi.fn(),
    threadMessages: vi.fn(),
  },
}))
vi.mock("@/lib/tenxgraph-client", () => ({ getTenxGraphClient: () => client }))

describe("ThreadsPage detail error", () => {
  it("shows the error with Retry that reloads the thread", async () => {
    client.threads.mockResolvedValue({
      data: { threads: [{ thread_id: "a" }] },
    })
    client.threadState.mockResolvedValue({ data: { state: {} } })
    client.threadMessages.mockResolvedValue({ data: { messages: [] } })
    const store = configureStore({
      reducer: { threads: threadsReducer },
      preloadedState: {
        threads: {
          list: [{ thread_id: "a" }],
          listStatus: "ready",
          listError: null,
          selectedId: "a",
          detail: null,
          detailStatus: "error",
          detailError: "500 Internal Server Error",
          busy: false,
        },
      },
    })
    store.dispatch(listLoaded([{ thread_id: "a" }]))
    render(
      <MemoryRouter>
        <Provider store={store}>
          <ThreadsPage />
        </Provider>
      </MemoryRouter>
    )
    const alert = screen.getByRole("alert")
    expect(alert.textContent).toContain("500 Internal Server Error")
    client.threadState.mockClear()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(client.threadState).toHaveBeenCalledWith("a")
  })

  it("Open in Chat loads the thread history and navigates to /chat", async () => {
    client.threads.mockResolvedValue({
      data: { threads: [{ thread_id: "a" }] },
    })
    client.threadState.mockResolvedValue({ data: { state: {} } })
    client.threadMessages.mockResolvedValue({
      data: {
        messages: [
          { message_id: "m1", role: "user", content: "hi" },
          { message_id: "m2", role: "assistant", content: "hello" },
        ],
      },
    })
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
            <Route path="/chat" element={<div>chat route</div>} />
          </Routes>
        </Provider>
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole("button", { name: /Open in Chat/ }))
    expect(await screen.findByText("chat route")).toBeTruthy()
    expect(store.getState().chat.threadId).toBe("a")
    expect(store.getState().chat.messages).toHaveLength(2)
  })

  it("shows Load more only when the server reports has_more", async () => {
    const rows = (n) =>
      Array.from({ length: n }, (_, i) => ({ thread_id: `t${i}` }))
    const view = () => {
      const store = configureStore({ reducer: { threads: threadsReducer } })
      return render(
        <MemoryRouter>
          <Provider store={store}>
            <ThreadsPage />
          </Provider>
        </MemoryRouter>
      )
    }
    client.threadState.mockResolvedValue({ data: { state: {} } })
    client.threadMessages.mockResolvedValue({ data: { messages: [] } })
    client.threads.mockResolvedValue({
      data: { threads: rows(50), has_more: true },
    })
    const a = view()
    expect(
      await screen.findByRole("button", { name: "Load more" })
    ).toBeTruthy()
    expect(screen.getByText("50 loaded, more available")).toBeTruthy()
    a.unmount()
    client.threads.mockResolvedValue({
      data: { threads: rows(3), has_more: false },
    })
    view()
    expect(await screen.findByText("3 loaded")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull()
  })
})
