/* eslint-disable import/order */
import { createSlice } from "@reduxjs/toolkit"
import { invokeGraph, streamGraph } from "@/services/api/graph.api"

const initialState = {
  threads: [],
  activeThreadId: null,
  isLoading: false,
  error: null,
  // track per-thread generation and abort controllers
  generating: {}, // { [threadId]: boolean }
  abortControllers: {}, // { [threadId]: AbortController }
}

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
      state.isLoading = false
    },
    createThread: (state, action) => {
      const newThread = {
        id: action.payload.id || Date.now().toString(),
        title: action.payload.title || "New Chat",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      state.threads.unshift(newThread)
      state.activeThreadId = newThread.id
    },
    setActiveThread: (state, action) => {
      state.activeThreadId = action.payload
    },
    addMessage: (state, action) => {
      const { threadId, message } = action.payload
      const thread = state.threads.find((t) => t.id === threadId)
      if (thread) {
        const newMessage = {
          id: message.id || Date.now().toString(),
          content: message.content,
          role: message.role, // 'user' | 'assistant' | 'tool'
          timestamp: message.timestamp || new Date().toISOString(),
        }
        thread.messages.push(newMessage)
        thread.updatedAt = new Date().toISOString()

        // Update thread title with first user message if it's still "New Chat"
        if (thread.title === "New Chat" && message.role === "user") {
          thread.title =
            message.content.length > 50
              ? `${message.content.slice(0, 50)}...`
              : message.content
        }
      }
    },
    updateMessage: (state, action) => {
      const { threadId, messageId, content } = action.payload
      const thread = state.threads.find((t) => t.id === threadId)
      if (thread) {
        const message = thread.messages.find((m) => m.id === messageId)
        if (message) {
          message.content = content
          message.timestamp = new Date().toISOString()
          thread.updatedAt = new Date().toISOString()
        }
      }
    },
    deleteThread: (state, action) => {
      const threadId = action.payload
      state.threads = state.threads.filter((t) => t.id !== threadId)
      if (state.activeThreadId === threadId) {
        state.activeThreadId =
          state.threads.length > 0 ? state.threads[0].id : null
      }
    },
    updateThreadTitle: (state, action) => {
      const { threadId, title } = action.payload
      const thread = state.threads.find((t) => t.id === threadId)
      if (thread) {
        thread.title = title
        thread.updatedAt = new Date().toISOString()
      }
    },
    clearMessages: (state, action) => {
      const threadId = action.payload
      const thread = state.threads.find((t) => t.id === threadId)
      if (thread) {
        thread.messages = []
        thread.updatedAt = new Date().toISOString()
      }
    },
    setGenerating: (state, action) => {
      const { threadId, value } = action.payload
      if (!state.generating) state.generating = {}
      state.generating[threadId] = value
    },
    registerAbortController: (state, action) => {
      const { threadId, controller } = action.payload
      if (!state.abortControllers) state.abortControllers = {}
      state.abortControllers[threadId] = controller
    },
    clearAbortController: (state, action) => {
      const threadId = action.payload
      delete state.abortControllers[threadId]
    },
  },
})

export const {
  setLoading,
  setError,
  createThread,
  setActiveThread,
  addMessage,
  updateMessage,
  deleteThread,
  updateThreadTitle,
  clearMessages,
  setGenerating,
  registerAbortController,
  clearAbortController,
} = chatSlice.actions

export default chatSlice.reducer

// Helpers
const buildGraphBody = (settings, userContent) => ({
  messages: [
    {
      message_id: 0,
      role: "user",
      content: userContent,
    },
  ],
  initial_state: settings.init_state || {},
  config: settings.config || {},
  recursion_limit: settings.recursion_limit || 25,
  response_granularity: settings.response_granularity || "low",
  include_raw: Boolean(settings.include_raw),
})

/**
 * Send message deciding between invoke vs stream based on thread settings
 * @param {string} threadId ID of the thread to send message to
 * @param {string} content User message content
 */
export const sendMessage =
  (threadId, content) => async (dispatch, getState) => {
    const state = getState()
    const settings = state.threadSettingsStore

    // ensure user message exists in thread
    dispatch(
      addMessage({
        threadId,
        message: { content, role: "user" },
      })
    )

    const body = buildGraphBody(settings, content)

    if (settings.streaming_response) {
      await dispatch(streamAssistantAnswer(threadId, body))
    } else {
      await dispatch(invokeAssistantAnswer(threadId, body))
    }
  }

export const stopStreaming = (threadId) => (dispatch, getState) => {
  const { abortControllers } = getState().chatStore
  const controller = abortControllers[threadId]
  if (controller) {
    controller.abort()
  }
}

export const invokeAssistantAnswer = (threadId, body) => async (dispatch) => {
  dispatch(setGenerating({ threadId, value: true }))
  try {
    const response = await invokeGraph(body)
    handleInvokeResponse(dispatch, threadId, response)
  } catch (error) {
    dispatch(setError(error?.message || "Invoke failed"))
    dispatch(
      addMessage({
        threadId,
        message: {
          content: `Error: ${error?.message || error}`,
          role: "assistant",
        },
      })
    )
  } finally {
    dispatch(setGenerating({ threadId, value: false }))
  }
}

/**
 * Handle the invoke API response and append messages to the thread.
 */
function handleInvokeResponse(dispatch, threadId, response) {
  const payload = response?.data?.data || response?.data
  const messages = payload?.messages || []
  messages.forEach((m) => {
    dispatch(
      addMessage({
        threadId,
        message: {
          content: m.content || "",
          role: m.role === "tool" ? "tool" : m.role || "assistant",
        },
      })
    )
  })
}

export const streamAssistantAnswer = (threadId, body) => async (dispatch) => {
  dispatch(setGenerating({ threadId, value: true }))
  const controller = new globalThis.AbortController()
  dispatch(registerAbortController({ threadId, controller }))

  // create a placeholder assistant message to append deltas
  const assistantId = Date.now().toString()
  dispatch(
    addMessage({
      threadId,
      message: { id: assistantId, content: "", role: "assistant" },
    })
  )

  try {
    await processStream(dispatch, threadId, controller, assistantId, body)
  } catch (error) {
    if (error?.name !== "AbortError") {
      dispatch(setError(error?.message || "Stream failed"))
      dispatch(
        updateMessage({
          threadId,
          messageId: assistantId,
          content: `Error: ${error?.message || error}`,
        })
      )
    }
  } finally {
    dispatch(setGenerating({ threadId, value: false }))
    dispatch(clearAbortController(threadId))
  }
}

/**
 * Process the streaming response and update the assistant message incrementally.
 */
async function processStream(
  dispatch,
  threadId,
  controller,
  assistantId,
  body
) {
  let accumulated = ""
  for await (const chunk of streamGraph(body, controller.signal)) {
    const data = chunk?.data || chunk
    accumulated = handleStreamDelta(
      dispatch,
      threadId,
      assistantId,
      data,
      accumulated
    )
  }
}

/** Update accumulated content from a stream chunk and append tool messages */
function handleStreamDelta(dispatch, threadId, assistantId, data, accumulated) {
  if (isToolMessage(data)) {
    maybeAppendToolMessage(dispatch, threadId, data)
    return accumulated
  }
  const delta = getDeltaText(data)
  if (!delta) return accumulated
  const nextAccum = `${accumulated}${delta}`
  dispatch(
    updateMessage({ threadId, messageId: assistantId, content: nextAccum })
  )
  return nextAccum
}

/** Extract text delta from a stream chunk */
// eslint-disable-next-line complexity
function getDeltaText(data) {
  if (typeof data?.delta?.content === "string" && data.delta.content) {
    return data.delta.content
  }
  if (typeof data?.message?.content === "string" && data.message.content) {
    return data.message.content
  }
  if (typeof data?.content === "string" && data.content) {
    return data.content
  }
  return ""
}

/** Whether a chunk represents a tool message */
function isToolMessage(data) {
  return Boolean(data?.message && data.message.role === "tool")
}

/** Append tool message from a stream chunk if present */
function maybeAppendToolMessage(dispatch, threadId, data) {
  if (data?.message && data.message.role === "tool") {
    dispatch(
      addMessage({
        threadId,
        message: { content: data.message.content || "", role: "tool" },
      })
    )
  }
}
