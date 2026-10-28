import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

import threadsReducer, {
  clearThread,
  listLoaded,
  loadThread,
  loadMoreMessages,
  loadMoreThreads,
  loadThreadList,
  removeMessage,
  removeThread,
  selectThread,
} from "@/store/threads-slice"

const { client, notifyError } = vi.hoisted(() => ({
  client: {
    threads: vi.fn(),
    threadState: vi.fn(),
    threadMessages: vi.fn(),
    deleteThread: vi.fn(),
    clearThreadState: vi.fn(),
    deleteMessage: vi.fn(),
  },
  notifyError: vi.fn(),
}))
vi.mock("@/lib/tenxgraph-client", () => ({ getTenxGraphClient: () => client }))
vi.mock("@/lib/notify", () => ({ notifyError }))

const A = { thread_id: "a" }
const B = { thread_id: "b" }

const setup = (list = [A, B], selected = "a") => {
  const store = configureStore({ reducer: { threads: threadsReducer } })
  store.dispatch(listLoaded(list))
  if (selected) store.dispatch(selectThread(selected))
  return store
}

beforeEach(() => {
  vi.clearAllMocks()
  client.threadState.mockImplementation(async (id) => ({
    data: { state: { id } },
  }))
  client.threadMessages.mockImplementation(async (id) => ({
    data: { messages: [{ message_id: `${id}-m` }] },
  }))
  client.deleteThread.mockResolvedValue({})
  client.clearThreadState.mockResolvedValue({})
  client.deleteMessage.mockResolvedValue({})
})

describe("removeThread", () => {
  it("selects and loads the next thread after deleting the selected one", async () => {
    const store = setup()
    await store.dispatch(removeThread("a"))
    const s = store.getState().threads
    expect(s.selectedId).toBe("b")
    expect(client.threadState).toHaveBeenCalledWith("b")
    expect(s.detail.messages).toEqual([{ message_id: "b-m" }])
    expect(s.detailStatus).toBe("ready")
  })

  it("shows the empty state after deleting the last thread", async () => {
    const store = setup([A])
    await store.dispatch(removeThread("a"))
    const s = store.getState().threads
    expect(s.selectedId).toBeNull()
    expect(s.detail).toBeNull()
  })

  it("does not reload when an unselected thread is deleted", async () => {
    const store = setup()
    await store.dispatch(removeThread("b"))
    expect(client.threadState).not.toHaveBeenCalled()
    expect(store.getState().threads.selectedId).toBe("a")
  })

  it("toasts and keeps the thread on failure", async () => {
    client.deleteThread.mockRejectedValue(new Error("boom"))
    const store = setup()
    const ok = await store.dispatch(removeThread("a"))
    expect(ok).toBe(false)
    expect(notifyError).toHaveBeenCalledWith(
      "Could not delete thread",
      expect.any(Error)
    )
    expect(store.getState().threads.list).toHaveLength(2)
    expect(store.getState().threads.busy).toBe(false)
  })

  it("resolves true on success", async () => {
    const store = setup()
    expect(await store.dispatch(removeThread("a"))).toBe(true)
  })
})

describe("loadThread errors", () => {
  it("both calls failing sets detailStatus error with the message", async () => {
    client.threadState.mockRejectedValue(new Error("state down"))
    client.threadMessages.mockRejectedValue(new Error("msgs down"))
    const store = setup()
    await store.dispatch(loadThread("a"))
    const s = store.getState().threads
    expect(s.detailStatus).toBe("error")
    expect(s.detailError).toBe("state down")
  })

  it("messages failing but state ok loads state and sets detailError", async () => {
    client.threadMessages.mockRejectedValue(new Error("msgs down"))
    const store = setup()
    await store.dispatch(loadThread("a"))
    const s = store.getState().threads
    expect(s.detailStatus).toBe("ready")
    expect(s.detail.state).toEqual({ id: "a" })
    expect(s.detailError).toBe("msgs down")
  })

  it("a 404 on state is not an error", async () => {
    client.threadState.mockRejectedValue(
      Object.assign(new Error("nf"), { statusCode: 404 })
    )
    const store = setup()
    await store.dispatch(loadThread("a"))
    const s = store.getState().threads
    expect(s.detailError).toBeNull()
    expect(s.detailStatus).toBe("ready")
    expect(s.detail.messages).toEqual([{ message_id: "a-m" }])
  })
})

describe("clearThread and removeMessage failures", () => {
  it("clearThread toasts", async () => {
    client.clearThreadState.mockRejectedValue(new Error("x"))
    const store = setup()
    expect(await store.dispatch(clearThread("a"))).toBe(false)
    expect(notifyError).toHaveBeenCalledWith(
      "Could not clear state",
      expect.any(Error)
    )
    expect(store.getState().threads.busy).toBe(false)
  })

  it("removeMessage toasts", async () => {
    client.deleteMessage.mockRejectedValue(new Error("x"))
    const store = setup()
    expect(await store.dispatch(removeMessage("a", "m"))).toBe(false)
    expect(notifyError).toHaveBeenCalledWith(
      "Could not delete message",
      expect.any(Error)
    )
    expect(store.getState().threads.busy).toBe(false)
  })

  it("clearThread and removeMessage resolve true on success", async () => {
    const store = setup()
    expect(await store.dispatch(clearThread("a"))).toBe(true)
    expect(await store.dispatch(removeMessage("a", "m"))).toBe(true)
  })
})

describe("loadThreadList select option", () => {
  it("select: false does not load a thread", async () => {
    client.threads.mockResolvedValue({ data: { threads: [A, B] } })
    const store = configureStore({ reducer: { threads: threadsReducer } })
    await store.dispatch(loadThreadList({ select: false }))
    expect(store.getState().threads.list).toHaveLength(2)
    expect(client.threadState).not.toHaveBeenCalled()
  })
})

describe("threads paging", () => {
  const rows = (n, from = 0) =>
    Array.from({ length: n }, (_, i) => ({ thread_id: `t${from + i}` }))
  const make = () => configureStore({ reducer: { threads: threadsReducer } })

  it("has_more from the server drives hasMore and Load more appends the next page", async () => {
    client.threads.mockResolvedValueOnce({
      data: { threads: rows(50), has_more: true },
    })
    const store = make()
    await store.dispatch(loadThreadList({ select: false }))
    expect(client.threads).toHaveBeenCalledWith({ offset: 0, limit: 50 })
    expect(store.getState().threads.hasMore).toBe(true)

    client.threads.mockResolvedValueOnce({
      data: { threads: rows(7, 50), has_more: false },
    })
    await store.dispatch(loadMoreThreads())
    expect(client.threads).toHaveBeenLastCalledWith({ offset: 50, limit: 50 })
    expect(store.getState().threads.list).toHaveLength(57)
    expect(store.getState().threads.hasMore).toBe(false)
  })

  it("a full page without has_more is not treated as more", async () => {
    client.threads.mockResolvedValueOnce({
      data: { threads: rows(50), has_more: false },
    })
    const store = make()
    await store.dispatch(loadThreadList({ select: false }))
    expect(store.getState().threads.hasMore).toBe(false)
  })

  it("a short page leaves hasMore false", async () => {
    client.threads.mockResolvedValueOnce({ data: { threads: rows(3) } })
    const store = make()
    await store.dispatch(loadThreadList({ select: false }))
    expect(store.getState().threads.hasMore).toBe(false)
  })

  it("a new search goes to the server and restarts at offset 0", async () => {
    client.threads.mockResolvedValue({
      data: { threads: rows(50), has_more: true },
    })
    const store = make()
    await store.dispatch(loadThreadList({ select: false }))
    await store.dispatch(loadMoreThreads())
    client.threads.mockResolvedValueOnce({ data: { threads: rows(2) } })
    await store.dispatch(loadThreadList({ select: false, search: " abc " }))
    expect(client.threads).toHaveBeenLastCalledWith({
      search: "abc",
      offset: 0,
      limit: 50,
    })
    expect(store.getState().threads.list).toHaveLength(2)
    expect(store.getState().threads.search).toBe("abc")
  })

  it("loads messages in pages and appends the next one", async () => {
    const page = (n, from = 0) =>
      Array.from({ length: n }, (_, i) => ({ message_id: `m${from + i}` }))
    client.threadMessages.mockResolvedValueOnce({
      data: { messages: page(100), has_more: true },
    })
    const store = make()
    store.dispatch(listLoaded([A]))
    await store.dispatch(loadThread("a"))
    expect(client.threadMessages).toHaveBeenCalledWith("a", {
      offset: 0,
      limit: 100,
    })
    expect(store.getState().threads.detail.messagesHasMore).toBe(true)

    client.threadMessages.mockResolvedValueOnce({
      data: { messages: page(5, 100), has_more: false },
    })
    await store.dispatch(loadMoreMessages())
    expect(client.threadMessages).toHaveBeenLastCalledWith("a", {
      offset: 100,
      limit: 100,
    })
    const { detail } = store.getState().threads
    expect(detail.messages).toHaveLength(105)
    expect(detail.messagesHasMore).toBe(false)
  })
})
