import { configureStore } from "@reduxjs/toolkit"
import { describe, expect, it, vi } from "vitest"

import chatReducer from "@/store/chat-slice"
import { fixThread, sendMessage, stopGeneration } from "@/store/chat-thunks"

const { current, notify } = vi.hoisted(() => ({
  current: { client: null },
  notify: { error: vi.fn(), success: vi.fn() },
}))
vi.mock("@/lib/tenxgraph-client", () => ({
  getTenxGraphClient: () => current.client,
}))
vi.mock("@/lib/notify", () => ({
  notifyError: notify.error,
  notifySuccess: notify.success,
}))

// A request that only ends when the caller aborts it, like a real fetch.
const hangingInvoke = (_messages, options) =>
  new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      reject(Object.assign(new Error("aborted"), { name: "AbortError" }))
    })
  })

const makeStore = (mode) => {
  const store = configureStore({
    reducer: { chat: chatReducer },
    middleware: (gdm) => gdm({ serializableCheck: false }),
  })
  store.dispatch({ type: "chat/setMode", payload: mode })
  return store
}

const lastAgent = (store) =>
  store
    .getState()
    .chat.messages.filter((m) => m.role === "agent")
    .at(-1)

describe("Stop", () => {
  it("stream: stop before the thread id is known calls stopGraph once the first chunk carries it", async () => {
    let release
    const gate = new Promise((r) => (release = r))
    current.client = {
      stopGraph: vi.fn().mockResolvedValue({}),
      stream: () =>
        (async function* () {
          await gate
          yield { thread_id: "t9", event: "message" }
          yield { thread_id: "t9", event: "message" }
        })(),
    }
    const store = makeStore("stream")
    const run = store.dispatch(sendMessage("hi"))
    await store.dispatch(stopGeneration())
    expect(current.client.stopGraph).not.toHaveBeenCalled()
    release()
    await run
    expect(current.client.stopGraph).toHaveBeenCalledTimes(1)
    expect(current.client.stopGraph).toHaveBeenCalledWith("t9")
    expect(store.getState().chat.generating).toBe(false)
  })

  it("invoke: stop resolves the turn as stopped without waiting for the pending request", async () => {
    current.client = {
      stopGraph: vi.fn().mockResolvedValue({}),
      invoke: hangingInvoke,
    }
    const store = makeStore("invoke")
    const run = store.dispatch(sendMessage("hi"))
    await store.dispatch(stopGeneration())
    await run
    expect(lastAgent(store).runMeta.status).toBe("stopped")
    expect(store.getState().chat.generating).toBe(false)
  })

  it("passes an AbortSignal to the client call and Stop aborts it", async () => {
    let seen
    current.client = {
      stopGraph: vi.fn().mockResolvedValue({}),
      invoke: (_m, options) =>
        new Promise((_resolve, reject) => {
          seen = options.signal
          options.signal.addEventListener("abort", () => {
            const e = new Error("The operation was aborted")
            e.name = "AbortError"
            reject(e)
          })
        }),
    }
    const store = makeStore("invoke")
    const run = store.dispatch(sendMessage("hi"))
    expect(seen).toBeInstanceOf(AbortSignal)
    await store.dispatch(stopGeneration())
    await run
    expect(seen.aborted).toBe(true)
    expect(lastAgent(store).runMeta.status).toBe("stopped")
    expect(store.getState().chat.error).toBeNull()
  })

  it("an AbortError ends the turn as stopped, not as an error", async () => {
    const abortError = Object.assign(new Error("aborted"), {
      name: "AbortError",
    })
    current.client = {
      stream: () =>
        (async function* () {
          yield* []
          throw abortError
        })(),
    }
    const store = makeStore("stream")
    await store.dispatch(sendMessage("hi"))
    expect(lastAgent(store).runMeta.status).toBe("stopped")
    expect(store.getState().chat.error).toBeNull()
  })

  it("stopGraph rejection triggers notifyError", async () => {
    notify.error.mockClear()
    current.client = {
      stopGraph: vi.fn().mockRejectedValue(new Error("boom")),
      invoke: hangingInvoke,
    }
    const store = makeStore("invoke")
    store.dispatch({ type: "chat/setThreadId", payload: "t1" })
    const run = store.dispatch(sendMessage("hi"))
    await store.dispatch(stopGeneration())
    await run
    expect(notify.error).toHaveBeenCalledWith(
      "Could not stop the run",
      expect.any(Error)
    )
  })
})

describe("fixThread", () => {
  it("reports success", async () => {
    notify.success.mockClear()
    current.client = {
      fixGraph: vi.fn().mockResolvedValue({ data: { removed_count: 2 } }),
    }
    const store = makeStore("invoke")
    store.dispatch({ type: "chat/setThreadId", payload: "t1" })
    await store.dispatch(fixThread())
    expect(notify.success).toHaveBeenCalledWith(
      "Thread fixed",
      "Removed 2 message(s)."
    )
  })
})
