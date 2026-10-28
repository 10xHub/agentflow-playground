import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

import chatReducer from "@/store/chat-slice"
import {
  loadPendingInterrupt,
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

// The chat slice restores its thread cache from storage.
beforeEach(() => localStorage.clear())

const INTERRUPT = {
  id: "i1",
  node: "gate",
  message: "Send the email?",
  response_schema: { type: "boolean" },
}

const pausedChunks = [
  {
    event: "message",
    thread_id: "t1",
    message: { role: "assistant", content: "Drafting" },
  },
  {
    event: "updates",
    thread_id: "t1",
    data: { status: "interrupted", interrupt: INTERRUPT },
  },
]

const finalChunks = [
  {
    event: "message",
    thread_id: "t1",
    message: { role: "assistant", content: "Sent." },
  },
]

const streamOf = (chunks) =>
  (async function* () {
    yield* chunks
  })()

const makeStore = () =>
  configureStore({
    reducer: { chat: chatReducer },
    middleware: (gdm) => gdm({ serializableCheck: false }),
  })

const agents = (store) =>
  store.getState().chat.messages.filter((m) => m.role === "agent")

const pause = async (store) => {
  current.client = { stream: vi.fn(() => streamOf(pausedChunks)) }
  await store.dispatch(sendMessage("go"))
}

describe("interrupt in a streamed run", () => {
  it("ends as needs input, not done, and keeps the interrupt", async () => {
    const store = makeStore()
    await pause(store)
    const turn = agents(store)[0]
    expect(turn.runMeta.status).toBe("interrupted")
    expect(turn.answer[0]).toBe("Drafting")
    expect(store.getState().chat.pendingInterrupt.interrupt).toEqual(INTERRUPT)
    expect(store.getState().chat.generating).toBe(false)
  })

  it("approve resumes the same thread with resume and interrupt_id", async () => {
    const store = makeStore()
    await pause(store)
    current.client = { stream: vi.fn(() => streamOf(finalChunks)) }
    await store.dispatch(resumeRun(true))
    const [messages, options] = current.client.stream.mock.calls[0]
    expect(messages).toEqual([])
    expect(options).toMatchObject({
      resume: true,
      interrupt_id: "i1",
      config: { thread_id: "t1" },
    })
    expect(store.getState().chat.pendingInterrupt).toBeNull()
    const [paused, resumed] = agents(store)
    expect(paused.runMeta.status).toBe("answered")
    expect(resumed.answer[0]).toBe("Sent.")
    expect(resumed.runMeta.status).toBe("done")
  })

  it("reject resumes with null", async () => {
    const store = makeStore()
    await pause(store)
    current.client = { stream: vi.fn(() => streamOf(finalChunks)) }
    await store.dispatch(resumeRun(null))
    expect(current.client.stream.mock.calls[0][1].resume).toBeNull()
    expect(agents(store)[0].runMeta.status).toBe("rejected")
  })

  it("a 409 keeps the card open with the server message and adds no turn", async () => {
    const store = makeStore()
    await pause(store)
    current.client = {
      stream: () =>
        // eslint-disable-next-line require-yield
        (async function* () {
          throw new Error(
            "interrupt_id 'i1' does not match the open interrupt 'i2'"
          )
        })(),
    }
    await store.dispatch(resumeRun(true))
    const pending = store.getState().chat.pendingInterrupt
    expect(pending.error).toMatch(/does not match/)
    expect(pending.busy).toBe(false)
    expect(agents(store)).toHaveLength(1)
    expect(store.getState().chat.error).toBeNull()
    expect(store.getState().chat.generating).toBe(false)
  })

  it("can pause again after a resume", async () => {
    const store = makeStore()
    await pause(store)
    current.client = { stream: vi.fn(() => streamOf(pausedChunks)) }
    await store.dispatch(resumeRun(true))
    expect(store.getState().chat.pendingInterrupt.interrupt.id).toBe("i1")
    expect(agents(store)[1].runMeta.status).toBe("interrupted")
  })
})

describe("interrupt in invoke mode", () => {
  it("shows the pause read-only and never resumes", async () => {
    const store = makeStore()
    store.dispatch({ type: "chat/setMode", payload: "invoke" })
    current.client = {
      invoke: vi.fn().mockResolvedValue({
        messages: [{ role: "assistant", content: "Drafting" }],
        state: {
          execution_meta: {
            interrupt_reason: "interrupt",
            interrupt_data: { interrupt: INTERRUPT },
          },
        },
      }),
      stream: vi.fn(),
    }
    await store.dispatch(sendMessage("go"))
    expect(store.getState().chat.pendingInterrupt.interrupt.id).toBe("i1")
    await store.dispatch(resumeRun(true))
    expect(current.client.stream).not.toHaveBeenCalled()
  })
})

describe("loadPendingInterrupt", () => {
  it("offers the interrupt a reloaded thread is paused at", async () => {
    const store = makeStore()
    store.dispatch({ type: "chat/setThreadId", payload: "t1" })
    current.client = {
      threadState: vi.fn().mockResolvedValue({
        data: {
          state: {
            execution_meta: {
              interrupt_reason: "interrupt",
              interrupt_data: { interrupt: INTERRUPT },
            },
          },
        },
      }),
    }
    await store.dispatch(loadPendingInterrupt())
    expect(store.getState().chat.pendingInterrupt.interrupt).toEqual(INTERRUPT)
  })

  it("stays quiet for a thread that is not paused or a failed lookup", async () => {
    const store = makeStore()
    store.dispatch({ type: "chat/setThreadId", payload: "t1" })
    current.client = {
      threadState: vi.fn().mockResolvedValue({ data: { state: {} } }),
    }
    await store.dispatch(loadPendingInterrupt())
    current.client = { threadState: vi.fn().mockRejectedValue(new Error("x")) }
    await store.dispatch(loadPendingInterrupt())
    expect(store.getState().chat.pendingInterrupt).toBeNull()
  })
})

describe("remote_tool_call blocks", () => {
  it("become tool_call steps marked as run in the browser", async () => {
    const store = makeStore()
    current.client = {
      stream: () =>
        streamOf([
          {
            event: "message",
            thread_id: "t1",
            message: {
              role: "assistant",
              content: [
                {
                  type: "remote_tool_call",
                  id: "c1",
                  name: "get_location",
                  args: { precise: true },
                },
              ],
            },
          },
        ]),
    }
    await store.dispatch(sendMessage("where am i"))
    const [block] = agents(store)[0].blocks
    expect(block).toMatchObject({
      kind: "tool_call",
      callId: "c1",
      name: "get_location",
      remote: true,
    })
    expect(JSON.parse(block.code)).toEqual({ precise: true })
  })
})

describe("interrupt fallback after a stream with no interrupt chunk", () => {
  const pausedState = {
    data: {
      state: {
        execution_meta: {
          interrupt_reason: "interrupt",
          interrupt_data: { interrupt: INTERRUPT },
        },
      },
    },
  }
  const plain = [
    {
      event: "message",
      thread_id: "t1",
      message: { role: "assistant", content: "Drafting" },
    },
  ]

  it("checks thread state and shows the card for a paused run", async () => {
    const store = makeStore()
    current.client = {
      stream: vi.fn(() => streamOf(plain)),
      threadState: vi.fn().mockResolvedValue(pausedState),
    }
    await store.dispatch(sendMessage("go"))
    expect(current.client.threadState).toHaveBeenCalledWith("t1")
    expect(store.getState().chat.pendingInterrupt.interrupt).toEqual(INTERRUPT)
    expect(agents(store)[0].runMeta.status).toBe("interrupted")
  })

  it("does not check state when the stream already carried the interrupt", async () => {
    const store = makeStore()
    current.client = {
      stream: vi.fn(() => streamOf(pausedChunks)),
      threadState: vi.fn().mockResolvedValue(pausedState),
    }
    await store.dispatch(sendMessage("go"))
    expect(current.client.threadState).not.toHaveBeenCalled()
    expect(store.getState().chat.pendingInterrupt.interrupt).toEqual(INTERRUPT)
  })

  it("does not check state without a thread id", async () => {
    const store = makeStore()
    current.client = {
      stream: vi.fn(() =>
        streamOf([
          { event: "message", message: { role: "assistant", content: "x" } },
        ])
      ),
      threadState: vi.fn(),
    }
    await store.dispatch(sendMessage("go"))
    expect(current.client.threadState).not.toHaveBeenCalled()
  })

  it("leaves a finished run as done", async () => {
    const store = makeStore()
    current.client = {
      stream: vi.fn(() => streamOf(plain)),
      threadState: vi.fn().mockResolvedValue({ data: { state: {} } }),
    }
    await store.dispatch(sendMessage("go"))
    expect(store.getState().chat.pendingInterrupt).toBeNull()
    expect(agents(store)[0].runMeta.status).toBe("done")
  })
})

const pausedAt = (pause, node = "WORK") => [
  {
    event: "message",
    thread_id: "t1",
    message: { role: "assistant", content: "Working" },
  },
  {
    event: "updates",
    thread_id: "t1",
    data: { status: "node_invoked", node, pause },
  },
]

describe("interrupt_before / interrupt_after / remote_tool pauses", () => {
  it("before shows the pause and Continue sends an empty resume, not a message", async () => {
    const store = makeStore()
    current.client = { stream: vi.fn(() => streamOf(pausedAt("before"))) }
    await store.dispatch(sendMessage("go"))
    expect(store.getState().chat.pendingInterrupt.interrupt).toEqual({
      kind: "before",
      node: "WORK",
    })
    expect(agents(store)[0].runMeta.status).toBe("interrupted")

    current.client = { stream: vi.fn(() => streamOf(finalChunks)) }
    await store.dispatch(resumeRun(true))
    const [messages, options] = current.client.stream.mock.calls[0]
    expect(messages).toHaveLength(0)
    expect(options.resume).toBeNull()
    expect(options).not.toHaveProperty("interrupt_id")
    expect(options.config.thread_id).toBe("t1")
    expect(store.getState().chat.pendingInterrupt).toBeNull()
  })

  it("after is shown the same way", async () => {
    const store = makeStore()
    current.client = { stream: vi.fn(() => streamOf(pausedAt("after"))) }
    await store.dispatch(sendMessage("go"))
    expect(store.getState().chat.pendingInterrupt.interrupt.kind).toBe("after")
  })

  const toolCall = {
    event: "message",
    thread_id: "t1",
    message: {
      role: "assistant",
      content: [{ type: "remote_tool_call", id: "c1", name: "pick_color" }],
    },
  }
  const toolPause = {
    event: "updates",
    thread_id: "t1",
    data: { status: "node_invoked", node: "TOOL", pause: "remote_tool" },
  }

  it("remote_tool with no handler shows a waiting note and has nothing to resume", async () => {
    const store = makeStore()
    current.client = {
      stream: vi.fn(() => streamOf([toolCall, toolPause])),
    }
    await store.dispatch(sendMessage("pick"))
    expect(store.getState().chat.pendingInterrupt.interrupt).toEqual({
      kind: "remote_tool",
      node: "TOOL",
      tool: "pick_color",
    })
    await store.dispatch(resumeRun(true))
    expect(current.client.stream).toHaveBeenCalledTimes(1)
  })

  it("remote_tool is hidden when a registered handler runs the tool", async () => {
    localStorage.setItem(
      "10xgraph.client-tools",
      JSON.stringify([{ name: "pick_color", registered: true }])
    )
    const store = makeStore()
    current.client = {
      stream: vi.fn(() => streamOf([toolCall, toolPause])),
    }
    await store.dispatch(sendMessage("pick"))
    expect(store.getState().chat.pendingInterrupt).toBeNull()
  })

  it("remote_tool is dropped when the stream goes on after it", async () => {
    const store = makeStore()
    current.client = {
      stream: vi.fn(() => streamOf([toolCall, toolPause, ...finalChunks])),
    }
    await store.dispatch(sendMessage("pick"))
    expect(store.getState().chat.pendingInterrupt).toBeNull()
  })

  it("loadPendingInterrupt offers a before pause from the saved state", async () => {
    const store = makeStore()
    store.dispatch({ type: "chat/setThreadId", payload: "t1" })
    current.client = {
      threadState: vi.fn().mockResolvedValue({
        data: {
          state: {
            execution_meta: {
              interrupt_reason: "interrupt_before: WORK",
              interrupted_node: "WORK",
            },
          },
        },
      }),
    }
    await store.dispatch(loadPendingInterrupt())
    expect(store.getState().chat.pendingInterrupt.interrupt).toEqual({
      kind: "before",
      node: "WORK",
    })
  })
})
