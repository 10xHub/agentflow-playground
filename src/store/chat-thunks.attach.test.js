import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

import chatReducer from "@/store/chat-slice"
import { sendMessage } from "@/store/chat-thunks"

const { current } = vi.hoisted(() => ({ current: { client: null } }))
vi.mock("@/lib/tenxgraph-client", () => ({
  getTenxGraphClient: () => current.client,
}))
vi.mock("@/lib/notify", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}))

beforeEach(() => localStorage.clear())

const attachment = {
  file_id: "f1",
  mime_type: "image/png",
  filename: "a.png",
  size_bytes: 12,
}

const makeStore = () =>
  configureStore({
    reducer: { chat: chatReducer },
    middleware: (gdm) => gdm({ serializableCheck: false }),
  })

const setup = () => {
  current.client = {
    stream: vi.fn(() =>
      (async function* () {
        yield {
          event: "message",
          thread_id: "t",
          message: { role: "assistant", content: "ok" },
        }
      })()
    ),
  }
}

describe("sendMessage with attachments", () => {
  it("sends text and a file_id block, and records the attachment on the user turn", async () => {
    setup()
    const store = makeStore()
    await store.dispatch(sendMessage("what is this", [attachment]))
    const [messages] = current.client.stream.mock.calls[0]
    expect(messages[0].content[1]).toMatchObject({
      type: "image",
      media: { kind: "file_id", file_id: "f1" },
    })
    const user = store.getState().chat.messages.find((m) => m.role === "user")
    expect(user.text).toBe("what is this")
    expect(user.attachments).toEqual([attachment])
  })

  it("allows an attachment with no text", async () => {
    setup()
    const store = makeStore()
    await store.dispatch(sendMessage("  ", [attachment]))
    expect(current.client.stream).toHaveBeenCalledTimes(1)
  })

  it("still ignores an empty send", async () => {
    setup()
    const store = makeStore()
    await store.dispatch(sendMessage("  ", []))
    expect(current.client.stream).not.toHaveBeenCalled()
  })
})
