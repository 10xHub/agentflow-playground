import { configureStore } from "@reduxjs/toolkit"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Provider } from "react-redux"
import { beforeEach, describe, expect, it, vi } from "vitest"

import chatReducer, { setThreadId, addUserMessage } from "@/store/chat-slice"
import threadsReducer from "@/store/threads-slice"

import ThreadPicker, { buildRows } from "./thread-picker"

const { client } = vi.hoisted(() => ({
  client: { threads: vi.fn(), threadMessages: vi.fn() },
}))
vi.mock("@/lib/tenxgraph-client", () => ({ getTenxGraphClient: () => client }))
vi.mock("@/lib/notify", () => ({ notifyError: vi.fn() }))

const setup = () => {
  const store = configureStore({
    reducer: { chat: chatReducer, threads: threadsReducer },
  })
  render(
    <Provider store={store}>
      <ThreadPicker />
    </Provider>
  )
  fireEvent.click(screen.getByTitle("Switch thread"))
  return store
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  client.threads.mockResolvedValue({
    data: {
      threads: [
        {
          thread_id: "srv-aaaa-1111",
          thread_name: "Server thread",
          updated_at: null,
        },
      ],
    },
  })
  client.threadMessages.mockResolvedValue({
    data: { messages: [{ message_id: "u", role: "user", content: "hello" }] },
  })
})

describe("ThreadPicker", () => {
  it("lists server threads and loads the picked thread's history", async () => {
    const store = setup()
    const row = await screen.findByText("Server thread")
    fireEvent.click(row)
    await waitFor(() =>
      expect(store.getState().chat.threadId).toBe("srv-aaaa-1111")
    )
    expect(store.getState().chat.messages[0].text).toBe("hello")
  })

  it("shows Load more from has_more, not from the page size", async () => {
    client.threads.mockResolvedValue({
      data: {
        threads: [{ thread_id: "a-1", thread_name: "One", updated_at: null }],
        has_more: true,
      },
    })
    setup()
    expect(await screen.findByText("Load more")).toBeTruthy()
  })

  it("hides Load more when has_more is false", async () => {
    client.threads.mockResolvedValue({
      data: {
        threads: Array.from({ length: 200 }, (_, i) => ({
          thread_id: `t-${i}`,
          thread_name: `T${i}`,
          updated_at: null,
        })),
        has_more: false,
      },
    })
    setup()
    await screen.findByText("T0")
    expect(screen.queryByText("Load more")).toBeNull()
  })

  it("keeps a just-created local thread visible before the server lists it", async () => {
    const store = configureStore({
      reducer: { chat: chatReducer, threads: threadsReducer },
    })
    store.dispatch(addUserMessage({ id: "1", text: "fresh chat", time: "" }))
    store.dispatch(setThreadId("new-thread-id"))
    render(
      <Provider store={store}>
        <ThreadPicker />
      </Provider>
    )
    fireEvent.click(screen.getByTitle("Switch thread"))
    expect(await screen.findByText("Server thread")).toBeTruthy()
    expect(screen.getAllByText("fresh chat").length).toBeGreaterThan(0)
  })

  it("searches on the server", async () => {
    setup()
    await screen.findByText("Server thread")
    fireEvent.change(screen.getByPlaceholderText("Search threads…"), {
      target: { value: "abc" },
    })
    await waitFor(() =>
      expect(client.threads).toHaveBeenLastCalledWith({
        search: "abc",
        offset: 0,
        limit: 50,
      })
    )
  })
})

describe("buildRows", () => {
  it("puts cache-only threads first and hides them while searching", () => {
    const args = {
      serverList: [{ thread_id: "s", thread_name: "S" }],
      order: ["c", "s"],
      byId: { c: { title: "C" }, s: { title: "old" } },
    }
    expect(buildRows({ ...args, searching: false }).map((r) => r.id)).toEqual([
      "c",
      "s",
    ])
    expect(buildRows({ ...args, searching: true }).map((r) => r.id)).toEqual([
      "s",
    ])
  })
})
