import { configureStore } from "@reduxjs/toolkit"
import { describe, expect, it, vi } from "vitest"

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

const reasoning = (summary) => ({ type: "reasoning", summary })
const text = (t) => ({ type: "text", text: t })
const msg = (content, delta) => ({
  thread_id: "t1",
  event: "message",
  message: { role: "assistant", delta, content },
})

const run = async (chunks) => {
  current.client = {
    stopGraph: vi.fn(),
    stream: () =>
      (async function* () {
        for (const c of chunks) yield c
      })(),
  }
  const store = configureStore({
    reducer: { chat: chatReducer },
    middleware: (gdm) => gdm({ serializableCheck: false }),
  })
  store.dispatch({ type: "chat/setMode", payload: "stream" })
  await store.dispatch(sendMessage("hi"))
  return store
    .getState()
    .chat.messages.filter((m) => m.role === "agent")
    .at(-1)
}

const rows = (agent) => agent.blocks.filter((b) => b.kind === "reasoning")

describe("streamed reasoning", () => {
  it("deltas then final (reasoning first) give one reasoning row with full text and one answer", async () => {
    const agent = await run([
      msg([reasoning("Let me ")], true),
      msg([reasoning("think.")], true),
      msg([text("Hel")], true),
      msg([text("lo")], true),
      msg([reasoning("Let me think."), text("Hello")], false),
    ])
    expect(rows(agent)).toHaveLength(1)
    expect(rows(agent)[0].text).toBe("Let me think.")
    expect(agent.answer).toEqual(["Hello"])
  })

  it("an older server's final message with text before reasoning still gives one row", async () => {
    const agent = await run([
      msg([reasoning("Let me ")], true),
      msg([reasoning("think.")], true),
      msg([text("Hello")], true),
      msg([text("Hello"), reasoning("Let me think.")], false),
    ])
    expect(rows(agent)).toHaveLength(1)
    expect(rows(agent)[0].text).toBe("Let me think.")
    expect(agent.answer).toEqual(["Hello"])
  })

  it("keeps several reasoning blocks of one message as separate rows", async () => {
    const agent = await run([
      msg([reasoning("one"), reasoning("two"), text("x")], false),
    ])
    expect(rows(agent).map((r) => r.text)).toEqual(["one", "two"])
  })

  it("reasoning from a later model call in the same turn gets its own row", async () => {
    const agent = await run([
      msg([reasoning("first")], false),
      msg([reasoning("second"), text("done")], false),
    ])
    expect(rows(agent).map((r) => r.text)).toEqual(["first", "second"])
  })
})
