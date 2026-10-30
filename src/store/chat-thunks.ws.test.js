import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

import chatReducer, { setMode } from "@/store/chat-slice"
import {
  WS_UNAVAILABLE_MESSAGE,
  resumeRun,
  sendMessage,
} from "@/store/chat-thunks"

const { current } = vi.hoisted(() => ({ current: { client: null } }))
vi.mock("@/lib/tenxgraph-client", () => ({
  getTenxGraphClient: () => current.client,
}))
vi.mock("@/lib/notify", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}))

beforeEach(() => localStorage.clear())

const INTERRUPT = {
  id: "i1",
  node: "gate",
  response_schema: { type: "boolean" },
}
const streamOf = (chunks) =>
  (async function* () {
    yield* chunks
  })()

const makeStore = () => {
  const store = configureStore({
    reducer: { chat: chatReducer },
    middleware: (gdm) => gdm({ serializableCheck: false }),
  })
  store.dispatch(setMode("ws"))
  return store
}

describe("ws chat mode", () => {
  it("setMode accepts ws", () => {
    expect(makeStore().getState().chat.mode).toBe("ws")
  })

  it("sends over wsStream and adopts the server thread id", async () => {
    const store = makeStore()
    current.client = {
      wsStream: vi.fn(() =>
        streamOf([
          {
            event: "message",
            thread_id: "srv-1",
            message: { role: "assistant", content: "Hi" },
          },
          {
            event: "updates",
            thread_id: "srv-1",
            data: { status: "completed" },
          },
        ])
      ),
      stream: vi.fn(),
    }
    await store.dispatch(sendMessage("hello"))
    expect(current.client.wsStream).toHaveBeenCalledTimes(1)
    expect(current.client.stream).not.toHaveBeenCalled()
    expect(store.getState().chat.threadId).toBe("srv-1")
  })

  it("an interrupt in ws mode resumes over wsStream with interrupt_id", async () => {
    const store = makeStore()
    current.client = {
      wsStream: vi.fn(() =>
        streamOf([
          {
            event: "message",
            thread_id: "t1",
            message: { role: "assistant", content: "Draft" },
          },
          {
            event: "updates",
            thread_id: "t1",
            data: { status: "interrupted", interrupt: INTERRUPT },
          },
        ])
      ),
    }
    await store.dispatch(sendMessage("go"))
    expect(store.getState().chat.pendingInterrupt.interrupt).toEqual(INTERRUPT)
    current.client = {
      wsStream: vi.fn(() =>
        streamOf([
          {
            event: "message",
            thread_id: "t1",
            message: { role: "assistant", content: "Done" },
          },
        ])
      ),
      stream: vi.fn(),
    }
    await store.dispatch(resumeRun(true))
    const [messages, options] = current.client.wsStream.mock.calls[0]
    expect(messages).toEqual([])
    expect(options).toMatchObject({
      resume: true,
      interrupt_id: "i1",
      config: { thread_id: "t1" },
    })
    expect(current.client.stream).not.toHaveBeenCalled()
  })

  it("maps a failed WebSocket upgrade to a clear message", async () => {
    const store = makeStore()
    current.client = {
      wsStream: () =>
        (async function* () {
          yield* []
          throw new Error("WebSocket connection failed")
        })(),
    }
    await store.dispatch(sendMessage("hello"))
    expect(store.getState().chat.error).toBe(WS_UNAVAILABLE_MESSAGE)
    expect(WS_UNAVAILABLE_MESSAGE).toContain("10xgraph-api[websocket]")
  })
})
