/* eslint-disable import/order */
import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { uploadFileMock, getAgentFlowClientMock } = vi.hoisted(() => ({
  uploadFileMock: vi.fn(),
  getAgentFlowClientMock: vi.fn(),
}))

vi.mock("@/lib/agentflow-client", () => ({
  getAgentFlowClient: getAgentFlowClientMock,
}))

vi.mock("@/services/api/graph.api", () => ({
  invokeGraph: vi.fn(),
  streamGraph: vi.fn(),
}))

vi.mock("@10xscale/agentflow-client", () => {
  class MockMessage {
    constructor(role, content, message_id = null) {
      this.role = role
      this.content = content
      this.message_id = message_id
    }
  }

  const textMessageMock = vi.fn((content, role) => ({ content, role }))
  MockMessage.text_message = textMessageMock

  return {
    Message: MockMessage,
  }
})

import { getAgentFlowClient } from "@/lib/agentflow-client"
import { invokeGraph, streamGraph } from "@/services/api/graph.api"
import { Message } from "@10xscale/agentflow-client"

import chatReducer, {
  addMessage,
  createThread,
  sendMessage,
  streamAssistantAnswer,
} from "./chat.slice"
import stateReducer from "./state.slice"
import threadSettingsReducer from "./thread-settings.slice"

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
  const WEATHER_TEXT = "The weather is sunny."
  beforeEach(() => {
    vi.clearAllMocks()
    invokeGraph.mockResolvedValue({ messages: [], meta: {}, context: [] })
    getAgentFlowClientMock.mockReturnValue({
      uploadFile: uploadFileMock,
    })
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
    const weatherText = WEATHER_TEXT

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
    const weatherText = WEATHER_TEXT

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

describe("chat slice file uploads", () => {
  const mockImageFile = new File(["image-data"], "photo.png", {
    type: "image/png",
  })
  const mockPdfFile = new File(["pdf-data"], "document.pdf", {
    type: "application/pdf",
  })
  const mockAudioFile = new File(["audio-data"], "recording.mp3", {
    type: "audio/mpeg",
  })
  const mockVideoFile = new File(["video-data"], "clip.mp4", {
    type: "video/mp4",
  })
  const mockTextFile = new File(["text-data"], "notes.txt", {
    type: "text/plain",
  })

  beforeEach(() => {
    vi.clearAllMocks()
    invokeGraph.mockResolvedValue({ messages: [], meta: {}, context: [] })
    getAgentFlowClientMock.mockReturnValue({
      uploadFile: uploadFileMock,
    })
    uploadFileMock.mockResolvedValue({
      file_id: "file-123",
      mime_type: "image/png",
      size_bytes: 1024,
      filename: "photo.png",
    })
  })

  it("does not dispatch when content is empty and no files provided", async () => {
    const store = createTestStore()

    await store.dispatch(sendMessage(THREAD_ID, "", []))

    expect(getThreadMessages(store)).toHaveLength(0)
    expect(invokeGraph).not.toHaveBeenCalled()
  })

  it("uploads image file and creates multimodal message with image block", async () => {
    uploadFileMock.mockResolvedValue({
      file_id: "img-001",
      mime_type: "image/png",
      size_bytes: 2048,
      filename: "photo.png",
    })

    const store = createTestStore()
    await store.dispatch(
      sendMessage(THREAD_ID, "Describe this image", [mockImageFile])
    )

    expect(uploadFileMock).toHaveBeenCalledWith(mockImageFile)

    const thread = store
      .getState()
      .chatStore.threads.find((t) => t.id === THREAD_ID)
    expect(thread.messages).toHaveLength(1)
    expect(thread.messages[0].role).toBe("user")
    expect(thread.messages[0].attachments).toHaveLength(1)
    expect(thread.messages[0].attachments[0]).toMatchObject({
      filename: "photo.png",
      mime_type: "image/png",
    })
  })

  it("uploads multiple files of different types and builds correct content blocks", async () => {
    uploadFileMock
      .mockResolvedValueOnce({
        file_id: "img-001",
        mime_type: "image/png",
        filename: "photo.png",
      })
      .mockResolvedValueOnce({
        file_id: "doc-001",
        mime_type: "application/pdf",
        filename: "document.pdf",
      })
      .mockResolvedValueOnce({
        file_id: "aud-001",
        mime_type: "audio/mpeg",
        filename: "recording.mp3",
      })
      .mockResolvedValueOnce({
        file_id: "vid-001",
        mime_type: "video/mp4",
        filename: "clip.mp4",
      })

    const store = createTestStore()
    await store.dispatch(
      sendMessage(THREAD_ID, "Review these files", [
        mockImageFile,
        mockPdfFile,
        mockAudioFile,
        mockVideoFile,
      ])
    )

    expect(uploadFileMock).toHaveBeenCalledTimes(4)

    const messages = getThreadMessages(store)
    expect(messages).toHaveLength(1)
    expect(messages[0].attachments).toHaveLength(4)
    expect(messages[0].attachments[0].filename).toBe("photo.png")
    expect(messages[0].attachments[1].filename).toBe("document.pdf")
    expect(messages[0].attachments[2].filename).toBe("recording.mp3")
    expect(messages[0].attachments[3].filename).toBe("clip.mp4")
  })

  it("uploads document file and creates document content block", async () => {
    uploadFileMock.mockResolvedValue({
      file_id: "doc-001",
      mime_type: "application/pdf",
      filename: "document.pdf",
    })

    const store = createTestStore()
    await store.dispatch(
      sendMessage(THREAD_ID, "Summarize this document", [mockPdfFile])
    )

    expect(uploadFileMock).toHaveBeenCalledWith(mockPdfFile)

    const messages = getThreadMessages(store)
    expect(messages).toHaveLength(1)
    expect(messages[0].attachments).toHaveLength(1)
    expect(messages[0].attachments[0]).toMatchObject({
      filename: "document.pdf",
      mime_type: "application/pdf",
    })
  })

  it("sends text-only message when no files provided", async () => {
    const store = createTestStore()
    await store.dispatch(sendMessage(THREAD_ID, "Hello without files", []))

    expect(uploadFileMock).not.toHaveBeenCalled()
    expect(Message.text_message).toHaveBeenCalledWith(
      "Hello without files",
      "user"
    )

    const messages = getThreadMessages(store)
    expect(messages).toHaveLength(1)
    expect(messages[0].attachments).toBeNull()
  })

  it("sends message with only files and no text content", async () => {
    uploadFileMock.mockResolvedValue({
      file_id: "img-001",
      mime_type: "image/png",
      filename: "photo.png",
    })

    const store = createTestStore()
    await store.dispatch(sendMessage(THREAD_ID, "", [mockImageFile]))

    expect(uploadFileMock).toHaveBeenCalledWith(mockImageFile)

    const messages = getThreadMessages(store)
    expect(messages).toHaveLength(1)
    expect(messages[0].content).toBe("")
    expect(messages[0].attachments).toHaveLength(1)
  })

  it("stores attachment metadata with correct file information", async () => {
    const customFile = new File(["data"], "report.csv", {
      type: "text/csv",
    })
    Object.defineProperty(customFile, "size", { value: 5120 })

    uploadFileMock.mockResolvedValue({
      file_id: "csv-001",
      mime_type: "text/csv",
      size_bytes: 5120,
      filename: "report.csv",
    })

    const store = createTestStore()
    await store.dispatch(
      sendMessage(THREAD_ID, "Process this CSV", [customFile])
    )

    const messages = getThreadMessages(store)
    expect(messages[0].attachments).toHaveLength(1)
    expect(messages[0].attachments[0]).toMatchObject({
      filename: "report.csv",
      mime_type: "text/csv",
      size: 5120,
    })
  })

  it("handles upload failure gracefully", async () => {
    uploadFileMock.mockRejectedValue(new Error("Upload failed"))

    const store = createTestStore()

    await expect(
      store.dispatch(sendMessage(THREAD_ID, "This will fail", [mockImageFile]))
    ).rejects.toThrow("Upload failed")
  })

  it("uses streaming path when streaming is enabled with files", async () => {
    uploadFileMock.mockResolvedValue({
      file_id: "img-001",
      mime_type: "image/png",
      filename: "photo.png",
    })

    streamGraph.mockImplementation(async function* mockStream() {
      yield {
        data: {
          message: {
            role: "assistant",
            content: [{ type: "text", text: "I can see the image" }],
          },
        },
      }
    })

    const store = configureStore({
      reducer: {
        chatStore: chatReducer,
        stateStore: stateReducer,
        threadSettingsStore: threadSettingsReducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }),
      preloadedState: {
        threadSettingsStore: {
          streaming_response: true,
          config: {},
          thread_id: THREAD_ID,
          thread_title: "",
          init_state: {},
          recursion_limit: 25,
          response_granularity: "low",
          include_raw: false,
        },
      },
    })

    store.dispatch(createThread({ id: THREAD_ID, title: "New Chat" }))

    await store.dispatch(
      sendMessage(THREAD_ID, "Look at this", [mockImageFile])
    )

    expect(uploadFileMock).toHaveBeenCalledWith(mockImageFile)
    expect(streamGraph).toHaveBeenCalled()
    expect(invokeGraph).not.toHaveBeenCalled()
  })
})
