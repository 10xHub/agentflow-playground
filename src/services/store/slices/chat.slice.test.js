/* eslint-disable import/order */
import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/services/api/graph.api", () => ({
  invokeGraph: vi.fn(),
  streamGraph: vi.fn(),
}))

vi.mock("@10xscale/agentflow-client", () => ({
  Message: {
    text_message: vi.fn((content, role) => ({ content, role })),
  },
}))

import { invokeGraph, streamGraph } from "@/services/api/graph.api"
import { Message } from "@10xscale/agentflow-client"

import chatReducer, {
  addMessage,
  createThread,
  sendMessage,
  streamAssistantAnswer,
} from "./chat.slice"
import stateReducer from "./state.slice"
import threadSettingsReducer from "./threadSettings.slice"

const THREAD_ID = "thread-1"
const HELLO_WORLD = "hello world"
const NEXT_THREAD_ID = "thread-2"
const NEXT_THREAD_TITLE = "Khulna Weather"
const WEATHER_SUMMARY = "Weather request completed"

const createTestStore = (threadId = THREAD_ID) => {
  const store = configureStore({
    reducer: {
      chatStore: chatReducer,
      stateStore: stateReducer,
      threadSettingsStore: threadSettingsReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  })

  store.dispatch(createThread({ id: threadId, title: "New Chat" }))

  return store
}

const getThreadMessages = (store, threadId = THREAD_ID) =>
  store.getState().chatStore.threads.find((thread) => thread.id === threadId)
    .messages

describe("chat slice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invokeGraph.mockResolvedValue({ messages: [], meta: {}, context: [] })
  })

  it("does not add blank messages to thread state", () => {
    const store = createTestStore()

    store.dispatch(
      addMessage({
        threadId: THREAD_ID,
        message: { content: "   ", role: "user" },
      })
    )

    expect(getThreadMessages(store)).toHaveLength(0)
  })

  it("sends only the latest user message to the backend", async () => {
    const store = createTestStore()

    store.dispatch(
      addMessage({
        threadId: THREAD_ID,
        message: {
          id: "reasoning-1",
          role: "assistant",
          kind: "reasoning",
          content: [{ type: "reasoning", summary: "thinking" }],
          rawContent: [{ type: "reasoning", summary: "thinking" }],
          allowEmpty: true,
        },
      })
    )

    await store.dispatch(sendMessage(THREAD_ID, `   ${HELLO_WORLD}   `))

    expect(Message.text_message).toHaveBeenCalledWith(HELLO_WORLD, "user")
    expect(invokeGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ thread_id: THREAD_ID }),
        messages: [{ content: HELLO_WORLD, role: "user" }],
      })
    )
  })

  it("keeps streamed reasoning, tool calls, tool results, and assistant text separate", async () => {
    const store = createTestStore()
    const weatherText = "The weather is sunny."

    streamGraph.mockImplementation(async function* mockStream() {
      yield {
        data: {
          message: {
            role: "assistant",
            content: [
              {
                type: "tool_call",
                id: "call-1",
                name: "get_weather",
                args: { location: "khulna" },
              },
            ],
            reasoning: "Need the weather tool.",
            tools_calls: [
              {
                id: "call-1",
                function: {
                  name: "get_weather",
                  arguments: '{"location":"khulna"}',
                },
              },
            ],
          },
        },
      }

      yield {
        data: {
          message: {
            role: "tool",
            content: [
              {
                type: "tool_result",
                call_id: "call-1",
                output: [{ location: "khulna", temperature: "25°C" }],
              },
            ],
            metadata: {
              function_name: "get_weather",
              tool_call_id: "call-1",
            },
          },
        },
      }

      yield {
        data: {
          message: {
            role: "assistant",
            content: [{ type: "text", text: weatherText }],
            delta: false,
          },
        },
      }
    })

    await store.dispatch(streamAssistantAnswer(THREAD_ID, { messages: [] }))

    const messages = getThreadMessages(store)

    expect(messages.map((message) => message.kind)).toEqual([
      "reasoning",
      "tool_call",
      "tool_result",
      "assistant",
    ])
    expect(messages[0].content).toContain("Need the weather tool")
    expect(messages[1].content).toContain("get_weather")
    expect(messages[2].content).toContain("25°C")
    expect(messages[3].content).toBe(weatherText)
  })

  it("corrects order when text chunk arrives before reasoning and tool_call chunks", async () => {
    const store = createTestStore()
    const weatherText = "The weather is sunny."

    // Simulates the real backend sending the final-text message FIRST,
    // followed by the reasoning+tool_call snapshot — the wrong arrival order.
    streamGraph.mockImplementation(async function* mockStream() {
      // Text arrives first (wrong order from backend)
      yield {
        data: {
          message: {
            role: "assistant",
            content: [{ type: "text", text: weatherText }],
            delta: false,
          },
        },
      }

      // Then the tool result
      yield {
        data: {
          message: {
            role: "tool",
            content: [
              {
                type: "tool_result",
                call_id: "call-1",
                output: [{ temperature: "25°C" }],
              },
            ],
            metadata: { function_name: "get_weather", tool_call_id: "call-1" },
          },
        },
      }

      // Then reasoning + tool_call snapshot
      yield {
        data: {
          message: {
            role: "assistant",
            content: [
              {
                type: "tool_call",
                id: "call-1",
                name: "get_weather",
                args: { location: "khulna" },
              },
            ],
            reasoning: "I need the weather tool.",
          },
        },
      }
    })

    await store.dispatch(streamAssistantAnswer(THREAD_ID, { messages: [] }))

    const messages = getThreadMessages(store)
    const kinds = messages.map((m) => m.kind)

    // Regardless of arrival order, display order must be:
    // reasoning → tool_call → tool_result → assistant text
    expect(kinds.indexOf("reasoning")).toBeLessThan(kinds.indexOf("tool_call"))
    expect(kinds.indexOf("tool_call")).toBeLessThan(
      kinds.indexOf("tool_result")
    )
    expect(kinds.indexOf("tool_result")).toBeLessThan(
      kinds.indexOf("assistant")
    )
  })

  it("does not create empty assistant messages for metadata-only stream chunks", async () => {
    const store = createTestStore()

    streamGraph.mockImplementation(async function* mockStream() {
      yield {
        data: {
          updates: { step: "metadata-only" },
          metadata: { thread_id: THREAD_ID },
        },
      }
    })

    await store.dispatch(streamAssistantAnswer(THREAD_ID, { messages: [] }))

    expect(getThreadMessages(store)).toHaveLength(0)
  })

  it("syncs streamed thread metadata and state updates", async () => {
    const store = createTestStore()

    streamGraph.mockImplementation(async function* mockStream() {
      yield {
        data: {
          message: {
            role: "assistant",
            content: [
              {
                type: "tool_call",
                id: "call-1",
                name: "get_weather",
                args: { location: "khulna" },
              },
            ],
          },
          metadata: {
            thread_id: NEXT_THREAD_ID,
            thread_name: NEXT_THREAD_TITLE,
          },
        },
      }

      yield {
        data: {
          state: {
            context_summary: WEATHER_SUMMARY,
            execution_meta: {
              thread_id: NEXT_THREAD_ID,
              current_node: "MAIN",
            },
          },
          metadata: {
            thread_id: NEXT_THREAD_ID,
            thread_name: NEXT_THREAD_TITLE,
          },
        },
      }
    })

    await store.dispatch(streamAssistantAnswer(THREAD_ID, { messages: [] }))

    const nextState = store.getState()
    const updatedThread = nextState.chatStore.threads.find(
      (thread) => thread.id === NEXT_THREAD_ID
    )

    expect(updatedThread?.title).toBe(NEXT_THREAD_TITLE)
    expect(nextState.chatStore.activeThreadId).toBe(NEXT_THREAD_ID)
    expect(nextState.threadSettingsStore.thread_id).toBe(NEXT_THREAD_ID)
    expect(nextState.threadSettingsStore.thread_title).toBe(NEXT_THREAD_TITLE)
    expect(nextState.stateStore.state.context_summary).toBe(WEATHER_SUMMARY)
    expect(nextState.stateStore.state.execution_meta.current_node).toBe("MAIN")
  })
})
