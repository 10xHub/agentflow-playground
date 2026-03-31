/* eslint-disable import/order, complexity */
import { createSlice } from "@reduxjs/toolkit"
import { Message } from "@10xscale/agentflow-client"

import {
  buildMessageText,
  hasRenderableMessageContent,
  normalizeTimestamp,
} from "@/lib/messageContent"
import { invokeGraph, streamGraph } from "@/services/api/graph.api"
import { listThreads as apiListThreads } from "@/services/api/thread.api"
import { listMessages as apiListMessages } from "@/services/api/message.api"

import { updateFullState, fetchThreadState } from "./state.slice"
import {
  setContextMetadata,
  setThreadId as setThreadSettingsId,
  setThreadTitle as setThreadSettingsTitle,
} from "./thread-settings.slice"

const MESSAGE_KIND = {
  USER: "user",
  ASSISTANT: "assistant",
  REASONING: "reasoning",
  TOOL_CALL: "tool_call",
  TOOL_RESULT: "tool_result",
  ERROR: "error",
}

// Lower number = earlier in the display order within a stream group
const STREAM_KIND_ORDER = {
  [MESSAGE_KIND.REASONING]: 0,
  [MESSAGE_KIND.TOOL_CALL]: 1,
  [MESSAGE_KIND.TOOL_RESULT]: 2,
  [MESSAGE_KIND.ASSISTANT]: 3,
  [MESSAGE_KIND.ERROR]: 4,
}

const initialState = {
  threads: [],
  activeThreadId: null,
  isLoading: false,
  error: null,
  generating: {},
  abortControllers: {},
}

const parseToolArguments = (value) => {
  if (typeof value !== "string") {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const getMessageFormattingOptions = (message = {}) => ({
  metadata: message.metadata,
  reasoning: message.reasoning,
  showToolDetails: true,
  toolCalls: message.toolsCalls || message.tools_calls,
})

const normalizeMessageContent = (content, options = {}) =>
  buildMessageText(content, options)

const normalizeUserContent = (content) =>
  normalizeMessageContent(content).trim()

const isBlankMessageContent = (content) =>
  normalizeUserContent(content).length === 0

const normalizeContentBlocks = (content) => {
  if (Array.isArray(content)) {
    return content.filter(Boolean)
  }

  if (typeof content === "string" && content.trim()) {
    return [{ type: "text", text: content }]
  }

  return []
}

const getMessageId = (message) =>
  message?.id || message?.message_id || Date.now().toString()

const getDefaultKind = (role) => {
  switch (role) {
    case "user":
      return MESSAGE_KIND.USER
    case "tool":
      return MESSAGE_KIND.TOOL_RESULT
    default:
      return MESSAGE_KIND.ASSISTANT
  }
}

const buildStoredMessage = (message = {}) => {
  const rawContent = message.rawContent ?? message.content ?? ""
  const formattingOptions = getMessageFormattingOptions(message)

  return {
    id: getMessageId(message),
    kind: message.kind || getDefaultKind(message.role),
    content: normalizeMessageContent(rawContent, formattingOptions),
    rawContent,
    role: message.role,
    timestamp: normalizeTimestamp(message.timestamp),
    metadata: message.metadata || {},
    reasoning: message.reasoning || "",
    toolsCalls: message.toolsCalls || message.tools_calls || null,
    streamGroup: message.streamGroup || null,
  }
}

const estimateContextTokens = (context = []) => {
  const totalWords = context.reduce((accumulator, message) => {
    const content = normalizeMessageContent(message.content).trim()

    if (!content) {
      return accumulator
    }

    return accumulator + content.split(/\s+/).length
  }, 0)

  return Math.ceil((totalWords / 750) * 1000)
}

const syncStateSnapshot = (dispatch, nextState) => {
  if (!nextState || typeof nextState !== "object") {
    return
  }

  dispatch(updateFullState(nextState))

  if (Array.isArray(nextState.context)) {
    dispatch(
      setContextMetadata({
        total_messages: nextState.context.length,
        total_tokens: estimateContextTokens(nextState.context),
      })
    )
  }
}

const syncThreadMetadata = (dispatch, threadId, metadata = {}) => {
  if (!metadata.thread_id) {
    return threadId
  }

  if (metadata.thread_id !== threadId) {
    dispatch(
      updateThreadId({ oldThreadId: threadId, newThreadId: metadata.thread_id })
    )
    threadId = metadata.thread_id
  }

  dispatch(setThreadSettingsId(metadata.thread_id))

  const threadTitle = metadata.thread_name || metadata.thread_title

  if (threadTitle) {
    dispatch(
      updateThreadTitle({
        threadId: metadata.thread_id,
        title: threadTitle,
      })
    )
    dispatch(setThreadSettingsTitle(threadTitle))
  }

  return threadId
}

const createMessageDraft = ({
  id,
  role,
  kind,
  rawContent,
  metadata = {},
  timestamp,
  reasoning = "",
  toolsCalls = null,
  allowEmpty = false,
  streamGroup = null,
}) => ({
  id,
  role,
  kind,
  content: rawContent,
  rawContent,
  metadata,
  timestamp,
  reasoning,
  toolsCalls,
  allowEmpty,
  streamGroup,
})

const getReasoningText = (message, blocks) => {
  if (typeof message.reasoning === "string" && message.reasoning.trim()) {
    return message.reasoning.trim()
  }

  return blocks
    .filter((block) => block?.type === "reasoning")
    .map((block) => block.summary || block.details || "")
    .filter(Boolean)
    .join("\n\n")
    .trim()
}

const getToolCallKey = (block, index) =>
  block?.id || block?.call_id || block?.name || `tool-call-${index}`

const getToolResultKey = (block, index, metadata = {}) =>
  block?.call_id ||
  metadata?.tool_call_id ||
  block?.id ||
  `tool-result-${index}`

const getToolCallBlocks = (message, blocks) => {
  const contentBlocks = blocks.filter((block) => block?.type === "tool_call")
  const seenKeys = new Set(
    contentBlocks.map((block, index) => getToolCallKey(block, index))
  )

  const toolCalls = Array.isArray(message.tools_calls)
    ? message.tools_calls
    : []
  const fallbackBlocks = toolCalls.reduce((accumulator, toolCall, index) => {
    const key = toolCall?.id || toolCall?.function?.name || `tool-call-${index}`

    if (seenKeys.has(key)) {
      return accumulator
    }

    seenKeys.add(key)
    accumulator.push({
      type: "tool_call",
      id: toolCall?.id,
      name: toolCall?.function?.name,
      args: parseToolArguments(toolCall?.function?.arguments),
    })
    return accumulator
  }, [])

  return [...contentBlocks, ...fallbackBlocks]
}

const getToolResultBlocks = (message, blocks) => {
  const contentBlocks = blocks.filter((block) => block?.type === "tool_result")

  if (contentBlocks.length > 0) {
    return contentBlocks
  }

  if (message.role === "tool" && typeof message.content === "string") {
    return [{ type: "tool_result", output: message.content }]
  }

  return []
}

const getTextRawContent = (content, blocks) => {
  if (typeof content === "string") {
    return content
  }

  const textBlocks = blocks.filter(
    (block) => block?.type === "text" && typeof block?.text === "string"
  )

  return textBlocks.length > 0 ? textBlocks : ""
}

const buildUserEntries = (message, ids = {}) => {
  const blocks = normalizeContentBlocks(message.content)
  const rawContent = getTextRawContent(message.content, blocks)

  if (!hasRenderableMessageContent(rawContent)) {
    return []
  }

  return [
    createMessageDraft({
      id: ids.baseId || getMessageId(message),
      role: "user",
      kind: MESSAGE_KIND.USER,
      rawContent,
      metadata: message.metadata,
      timestamp: message.timestamp,
      allowEmpty: message.allowEmpty,
    }),
  ]
}

const buildAssistantEntries = (message, ids = {}) => {
  const blocks = normalizeContentBlocks(message.content)
  const entries = []
  const baseId = ids.baseId || getMessageId(message)
  const reasoningText = getReasoningText(message, blocks)

  if (reasoningText) {
    entries.push(
      createMessageDraft({
        id: ids.reasoningId || `${baseId}:reasoning`,
        role: "assistant",
        kind: MESSAGE_KIND.REASONING,
        rawContent: [{ type: "reasoning", summary: reasoningText }],
        metadata: message.metadata,
        timestamp: message.timestamp,
        allowEmpty: message.allowEmpty,
        streamGroup: ids.streamGroup || null,
      })
    )
  }

  const toolCallBlocks = getToolCallBlocks(message, blocks)
  toolCallBlocks.forEach((block, index) => {
    entries.push(
      createMessageDraft({
        id:
          ids.toolCallIds?.[index] ||
          `${baseId}:tool_call:${getToolCallKey(block, index)}`,
        role: "assistant",
        kind: MESSAGE_KIND.TOOL_CALL,
        rawContent: [block],
        metadata: {
          ...(message.metadata || {}),
          function_name: block.name || message.metadata?.function_name,
          function_argument: block.args ?? message.metadata?.function_argument,
        },
        timestamp: message.timestamp,
        allowEmpty: true,
        streamGroup: ids.streamGroup || null,
      })
    )
  })

  const textRawContent =
    ids.textRawContent !== undefined
      ? ids.textRawContent
      : getTextRawContent(message.content, blocks)

  if (hasRenderableMessageContent(textRawContent)) {
    entries.push(
      createMessageDraft({
        id: ids.textId || `${baseId}:text`,
        role: "assistant",
        kind: message.kind || MESSAGE_KIND.ASSISTANT,
        rawContent: textRawContent,
        metadata: message.metadata,
        timestamp: message.timestamp,
        allowEmpty: message.allowEmpty,
        streamGroup: ids.streamGroup || null,
      })
    )
  }

  return entries
}

const buildToolEntries = (message, ids = {}) => {
  const blocks = normalizeContentBlocks(message.content)
  const toolResultBlocks = getToolResultBlocks(message, blocks)
  const baseId = ids.baseId || getMessageId(message)

  return toolResultBlocks.map((block, index) =>
    createMessageDraft({
      id:
        ids.toolResultIds?.[index] ||
        `${baseId}:tool_result:${getToolResultKey(block, index, message.metadata)}`,
      role: "tool",
      kind: MESSAGE_KIND.TOOL_RESULT,
      rawContent: [block],
      metadata: message.metadata,
      timestamp: message.timestamp,
      allowEmpty: true,
      streamGroup: ids.streamGroup || null,
    })
  )
}

const buildMessageEntries = (message, ids = {}) => {
  switch (message.role) {
    case "user":
      return buildUserEntries(message, ids)
    case "tool":
      return buildToolEntries(message, ids)
    default:
      return buildAssistantEntries(message, ids)
  }
}

const dispatchMessageEntries = (dispatch, threadId, entries) => {
  entries.forEach((entry) => {
    dispatch(
      addMessage({
        threadId,
        message: entry,
      })
    )
  })
}

const createStreamState = (threadId) => ({
  prefix: `${threadId}:${Date.now()}`,
  textContent: "",
  toolCallIds: new Map(),
  toolResultIds: new Map(),
})

const getStreamEntryId = (map, key, fallbackId) => {
  if (!map.has(key)) {
    map.set(key, fallbackId)
  }

  return map.get(key)
}

const resolveAssistantTextRawContent = (message, blocks, data, streamState) => {
  const textBlocks = blocks.filter(
    (block) => block?.type === "text" && typeof block?.text === "string"
  )

  if (
    message.delta &&
    textBlocks.length > 0 &&
    textBlocks.length === blocks.length
  ) {
    const deltaText = textBlocks.map((block) => block.text).join("")
    streamState.textContent = `${streamState.textContent}${deltaText}`
    return streamState.textContent
  }

  const snapshotText = getTextRawContent(message.content, blocks)
  if (hasRenderableMessageContent(snapshotText)) {
    streamState.textContent = normalizeMessageContent(snapshotText)
    return snapshotText
  }

  const fallbackDelta = normalizeMessageContent(
    data?.delta?.content || data?.content || ""
  )
  if (fallbackDelta) {
    streamState.textContent = `${streamState.textContent}${fallbackDelta}`
    return streamState.textContent
  }

  return ""
}

const handleAssistantStreamMessage = (
  dispatch,
  threadId,
  data,
  streamState
) => {
  const { message } = data
  const blocks = normalizeContentBlocks(message.content)
  const toolCallBlocks = getToolCallBlocks(message, blocks)
  const toolCallIds = toolCallBlocks.map((block, index) => {
    const key = getToolCallKey(block, index)
    return getStreamEntryId(
      streamState.toolCallIds,
      key,
      `${streamState.prefix}:tool_call:${key}`
    )
  })

  const entries = buildAssistantEntries(message, {
    baseId: streamState.prefix,
    reasoningId: `${streamState.prefix}:reasoning`,
    textId: `${streamState.prefix}:assistant`,
    toolCallIds,
    streamGroup: streamState.prefix,
    textRawContent: resolveAssistantTextRawContent(
      message,
      blocks,
      data,
      streamState
    ),
  })

  dispatchMessageEntries(dispatch, threadId, entries)
}

const handleToolStreamMessage = (dispatch, threadId, data, streamState) => {
  const { message } = data
  const blocks = normalizeContentBlocks(message.content)
  const toolResultBlocks = getToolResultBlocks(message, blocks)
  const toolResultIds = toolResultBlocks.map((block, index) => {
    const key = getToolResultKey(block, index, message.metadata)
    return getStreamEntryId(
      streamState.toolResultIds,
      key,
      `${streamState.prefix}:tool_result:${key}`
    )
  })

  const entries = buildToolEntries(message, {
    baseId: streamState.prefix,
    toolResultIds,
    streamGroup: streamState.prefix,
  })

  dispatchMessageEntries(dispatch, threadId, entries)
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
      const thread = state.threads.find((entry) => entry.id === threadId)

      if (!thread) {
        return
      }

      const normalizedContent = normalizeMessageContent(
        message.rawContent ?? message.content,
        getMessageFormattingOptions(message)
      )
      const allowEmpty = Boolean(message.allowEmpty)

      if (!allowEmpty && isBlankMessageContent(normalizedContent)) {
        return
      }

      const newMessage = buildStoredMessage(message)
      const existingMessage = thread.messages.find(
        (currentMessage) => currentMessage.id === newMessage.id
      )

      if (existingMessage) {
        existingMessage.kind = newMessage.kind
        existingMessage.content = newMessage.content
        existingMessage.rawContent = newMessage.rawContent
        existingMessage.role = newMessage.role
        existingMessage.timestamp = newMessage.timestamp
        existingMessage.metadata = newMessage.metadata
        existingMessage.reasoning = newMessage.reasoning
        existingMessage.toolsCalls = newMessage.toolsCalls
      } else if (newMessage.streamGroup) {
        // Insert at the correct position within this stream group based on kind order
        const newKindOrder = STREAM_KIND_ORDER[newMessage.kind] ?? 99
        let insertAfterIndex = -1
        let firstGroupIndex = -1

        thread.messages.forEach((existingMessage_, index) => {
          if (existingMessage_.streamGroup !== newMessage.streamGroup) {
            return
          }

          if (firstGroupIndex === -1) {
            firstGroupIndex = index
          }

          const existingKindOrder =
            STREAM_KIND_ORDER[existingMessage_.kind] ?? 99

          if (existingKindOrder <= newKindOrder) {
            insertAfterIndex = index
          }
        })

        if (firstGroupIndex === -1) {
          // No existing group members — append at end
          thread.messages.push(newMessage)
        } else if (insertAfterIndex === -1) {
          // New message has lowest order — insert before first group member
          thread.messages.splice(firstGroupIndex, 0, newMessage)
        } else {
          // Insert immediately after the last same-or-lower-order group member
          thread.messages.splice(insertAfterIndex + 1, 0, newMessage)
        }
      } else {
        thread.messages.push(newMessage)
      }

      thread.updatedAt = new Date().toISOString()

      if (
        thread.title === "New Chat" &&
        message.role === "user" &&
        !isBlankMessageContent(normalizedContent)
      ) {
        const titleContent = normalizeUserContent(normalizedContent)
        thread.title =
          titleContent.length > 50
            ? `${titleContent.slice(0, 50)}...`
            : titleContent
      }
    },
    updateMessage: (state, action) => {
      const { threadId, messageId, content, rawContent } = action.payload
      const thread = state.threads.find((entry) => entry.id === threadId)

      if (!thread) {
        return
      }

      const message = thread.messages.find((entry) => entry.id === messageId)
      if (!message) {
        return
      }

      const normalizedContent = normalizeMessageContent(
        rawContent ?? content,
        getMessageFormattingOptions(action.payload)
      )

      if (
        !action.payload.allowEmpty &&
        isBlankMessageContent(normalizedContent)
      ) {
        return
      }

      message.kind = action.payload.kind || message.kind
      message.content = normalizedContent
      message.rawContent = rawContent ?? content
      message.metadata = action.payload.metadata || message.metadata || {}
      message.reasoning = action.payload.reasoning || message.reasoning || ""
      message.toolsCalls =
        action.payload.toolsCalls ||
        action.payload.tools_calls ||
        message.toolsCalls ||
        null
      message.timestamp = normalizeTimestamp(action.payload.timestamp)
      thread.updatedAt = new Date().toISOString()
    },
    removeMessage: (state, action) => {
      const { threadId, messageId } = action.payload
      const thread = state.threads.find((entry) => entry.id === threadId)

      if (!thread) {
        return
      }

      thread.messages = thread.messages.filter(
        (message) => message.id !== messageId
      )
      thread.updatedAt = new Date().toISOString()
    },
    deleteThread: (state, action) => {
      const threadId = action.payload
      state.threads = state.threads.filter((entry) => entry.id !== threadId)

      if (state.activeThreadId === threadId) {
        state.activeThreadId =
          state.threads.length > 0 ? state.threads[0].id : null
      }
    },
    updateThreadTitle: (state, action) => {
      const { threadId, title } = action.payload
      const thread = state.threads.find((entry) => entry.id === threadId)

      if (!thread) {
        return
      }

      thread.title = title
      thread.updatedAt = new Date().toISOString()
    },
    updateThreadId: (state, action) => {
      const { oldThreadId, newThreadId } = action.payload
      const thread = state.threads.find((entry) => entry.id === oldThreadId)

      if (!thread) {
        return
      }

      thread.id = newThreadId
      thread.updatedAt = new Date().toISOString()

      if (state.activeThreadId === oldThreadId) {
        state.activeThreadId = newThreadId
      }

      if (oldThreadId in state.generating) {
        state.generating[newThreadId] = state.generating[oldThreadId]
        delete state.generating[oldThreadId]
      }

      if (oldThreadId in state.abortControllers) {
        state.abortControllers[newThreadId] =
          state.abortControllers[oldThreadId]
        delete state.abortControllers[oldThreadId]
      }
    },
    clearMessages: (state, action) => {
      const threadId = action.payload
      const thread = state.threads.find((entry) => entry.id === threadId)

      if (!thread) {
        return
      }

      thread.messages = []
      thread.updatedAt = new Date().toISOString()
    },
    setGenerating: (state, action) => {
      const { threadId, value } = action.payload
      state.generating[threadId] = value
    },
    registerAbortController: (state, action) => {
      const { threadId, controller } = action.payload
      state.abortControllers[threadId] = controller
    },
    clearAbortController: (state, action) => {
      delete state.abortControllers[action.payload]
    },
    mergeApiThreads: (state, action) => {
      const apiThreads = action.payload || []
      apiThreads.forEach((apiThread) => {
        const threadId = String(apiThread.thread_id)
        const existing = state.threads.find((t) => t.id === threadId)
        if (!existing) {
          state.threads.push({
            id: threadId,
            title: apiThread.thread_name || "Untitled",
            messages: [],
            createdAt: apiThread.updated_at || new Date().toISOString(),
            updatedAt: apiThread.updated_at || new Date().toISOString(),
          })
        } else {
          // Update metadata from API
          if (apiThread.thread_name && existing.title === "New Chat") {
            existing.title = apiThread.thread_name
          }
          if (apiThread.updated_at) {
            existing.updatedAt = apiThread.updated_at
          }
        }
      })
    },
    setThreadMessages: (state, action) => {
      const { threadId, messages } = action.payload
      const thread = state.threads.find((t) => t.id === threadId)
      if (!thread) return
      thread.messages = messages
      thread.updatedAt = new Date().toISOString()
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
  removeMessage,
  deleteThread,
  updateThreadTitle,
  updateThreadId,
  clearMessages,
  setGenerating,
  registerAbortController,
  clearAbortController,
  mergeApiThreads,
  setThreadMessages,
} = chatSlice.actions

export default chatSlice.reducer

export const sendMessage =
  (threadId, content) => async (dispatch, getState) => {
    const normalizedContent = normalizeUserContent(content)

    if (!normalizedContent) {
      return
    }

    const settings = getState().threadSettingsStore

    dispatch(
      addMessage({
        threadId,
        message: {
          id: `${threadId}:user:${Date.now()}`,
          content: normalizedContent,
          rawContent: normalizedContent,
          role: "user",
          kind: MESSAGE_KIND.USER,
        },
      })
    )

    const config = { ...settings.config }
    config.thread_id = settings.thread_id || threadId

    if (settings.thread_title) {
      config.thread_name = settings.thread_title
    }

    const body = {
      messages: [Message.text_message(normalizedContent, "user")],
      initial_state: settings.init_state || {},
      config,
      recursion_limit: settings.recursion_limit || 25,
      response_granularity: settings.response_granularity || "low",
      include_raw: Boolean(settings.include_raw),
    }

    if (settings.streaming_response) {
      await dispatch(streamAssistantAnswer(threadId, body))
      return
    }

    await dispatch(invokeAssistantAnswer(threadId, body))
  }

export const stopStreaming = (threadId) => (dispatch, getState) => {
  const controller = getState().chatStore.abortControllers[threadId]

  if (controller) {
    controller.abort()
  }
}

export const invokeAssistantAnswer = (threadId, body) => async (dispatch) => {
  dispatch(setGenerating({ threadId, value: true }))
  let activeThreadId = threadId

  try {
    const response = await invokeGraph(body)
    activeThreadId = handleInvokeResponse(dispatch, threadId, response)
  } catch (error) {
    dispatch(setError(error?.message || "Invoke failed"))
    dispatch(
      addMessage({
        threadId,
        message: {
          id: `${threadId}:error:${Date.now()}`,
          content: `Error: ${error?.message || error}`,
          rawContent: `Error: ${error?.message || error}`,
          role: "assistant",
          kind: MESSAGE_KIND.ERROR,
        },
      })
    )
  } finally {
    dispatch(setGenerating({ threadId: activeThreadId, value: false }))

    if (activeThreadId !== threadId) {
      dispatch(setGenerating({ threadId, value: false }))
    }
  }
}

const handleInvokeResponse = (dispatch, threadId, response) => {
  const messages = response?.messages || []
  const meta = response?.meta || {}
  const context = response?.context || []

  threadId = syncThreadMetadata(dispatch, threadId, meta)
  syncStateSnapshot(dispatch, response?.state)

  if (Array.isArray(context)) {
    dispatch(
      setContextMetadata({
        total_messages: context.length,
        total_tokens: estimateContextTokens(context),
      })
    )
  }

  messages.forEach((message) => {
    if (message.role === "user") {
      return
    }

    dispatchMessageEntries(
      dispatch,
      threadId,
      buildMessageEntries(message, {
        baseId: getMessageId(message),
      })
    )
  })

  return threadId
}

export const streamAssistantAnswer = (threadId, body) => async (dispatch) => {
  dispatch(setGenerating({ threadId, value: true }))
  const controller = new globalThis.AbortController()
  dispatch(registerAbortController({ threadId, controller }))

  let activeThreadId = threadId
  const streamState = createStreamState(threadId)

  try {
    activeThreadId = await processStream(
      dispatch,
      threadId,
      controller,
      body,
      streamState
    )
  } catch (error) {
    if (error?.name !== "AbortError") {
      dispatch(setError(error?.message || "Stream failed"))
      dispatch(
        addMessage({
          threadId: activeThreadId,
          message: {
            id: `${streamState.prefix}:error`,
            content: `Error: ${error?.message || error}`,
            rawContent: `Error: ${error?.message || error}`,
            role: "assistant",
            kind: MESSAGE_KIND.ERROR,
          },
        })
      )
    }
  } finally {
    dispatch(setGenerating({ threadId: activeThreadId, value: false }))
    dispatch(clearAbortController(activeThreadId))

    if (activeThreadId !== threadId) {
      dispatch(setGenerating({ threadId, value: false }))
      dispatch(clearAbortController(threadId))
    }
  }
}

const processStream = async (
  dispatch,
  threadId,
  controller,
  body,
  streamState
) => {
  let activeThreadId = threadId

  for await (const chunk of streamGraph(body, controller.signal)) {
    const data = chunk?.data || chunk
    activeThreadId = handleStreamChunk(
      dispatch,
      activeThreadId,
      data,
      streamState
    )
  }

  return activeThreadId
}

const handleStreamChunk = (dispatch, threadId, data, streamState) => {
  threadId = syncThreadMetadata(dispatch, threadId, data.metadata)
  syncStateSnapshot(dispatch, data.state)

  if (!data?.message) {
    if (data?.delta?.content || data?.content) {
      handleAssistantStreamMessage(
        dispatch,
        threadId,
        {
          ...data,
          message: {
            role: "assistant",
            content: data?.delta?.content || data?.content,
            delta: true,
          },
        },
        streamState
      )
    }

    return threadId
  }

  if (data.message.role === "user") {
    // Skip user messages from the stream — already added by sendMessage
    return threadId
  }

  if (data.message.role === "tool") {
    handleToolStreamMessage(dispatch, threadId, data, streamState)
    return threadId
  }

  handleAssistantStreamMessage(dispatch, threadId, data, streamState)
  return threadId
}

/**
 * Fetch threads from the API and merge into the Redux store
 */
export const fetchApiThreads = () => async (dispatch) => {
  try {
    const response = await apiListThreads()
    const threads = response?.data?.threads || []
    dispatch(mergeApiThreads(threads))
  } catch (error) {
    console.error("Failed to fetch threads from API:", error)
  }
}

/**
 * Select a thread and load its messages from the API
 */
export const selectThread = (threadId) => async (dispatch) => {
  dispatch(setActiveThread(threadId))
  dispatch(setThreadSettingsId(threadId))

  try {
    const response = await apiListMessages(threadId)
    const apiMessages = response?.data?.messages || []

    const messages = []
    apiMessages.forEach((message) => {
      const entries = buildMessageEntries(message, {
        baseId: getMessageId(message),
      })
      entries.forEach((entry) => {
        messages.push(buildStoredMessage(entry))
      })
    })

    dispatch(setThreadMessages({ threadId: String(threadId), messages }))
  } catch (error) {
    console.error("Failed to fetch thread messages:", error)
  }

  try {
    dispatch(fetchThreadState(threadId))
  } catch (error) {
    console.error("Failed to fetch thread state:", error)
  }
}
