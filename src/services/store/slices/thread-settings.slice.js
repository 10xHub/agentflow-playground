import { createSlice } from "@reduxjs/toolkit"

import ct from "@constants/"

const initialState = {
  thread_id: null, // Will be null until set by user or API response
  thread_title: "",
  config: {},
  init_state: {},
  streaming_response: false,
  show_tool_message_content: false,
  recursion_limit: 25,
  response_granularity: "low",
  include_raw: false,
  // readonly data
  context_total_messages: 0,
  context_total_tokens: 0,
  total_messages: 0,
  total_tokens: 0,
  total_tool_calls: 0,
  total_human_messages: 0,
  total_ai_messages: 0,
}

const threadSettingsSlice = createSlice({
  name: ct.store.THREAD_SETTINGS_STORE,
  initialState,
  reducers: {
    setThreadId: (state, action) => {
      state.thread_id = action.payload
    },
    setThreadTitle: (state, action) => {
      state.thread_title = action.payload
    },
    setConfig: (state, action) => {
      state.config = action.payload
    },
    setInitState: (state, action) => {
      state.init_state = action.payload
    },
    setStreamingResponse: (state, action) => {
      state.streaming_response = action.payload
    },
    setShowToolMessageContent: (state, action) => {
      state.show_tool_message_content = action.payload
    },
    setRecursionLimit: (state, action) => {
      state.recursion_limit = action.payload
    },
    setResponseGranularity: (state, action) => {
      state.response_granularity = action.payload
    },
    setIncludeRaw: (state, action) => {
      state.include_raw = action.payload
    },
    updateConfigKey: (state, action) => {
      const { key, value } = action.payload
      state.config[key] = value
    },
    removeConfigKey: (state, action) => {
      delete state.config[action.payload]
    },
    updateInitStateKey: (state, action) => {
      const { key, value } = action.payload
      state.init_state[key] = value
    },
    removeInitStateKey: (state, action) => {
      delete state.init_state[action.payload]
    },
    setReadonlyData: (state, action) => {
      const {
        total_messages,
        tool_token,
        total_token,
        total_tool_calls,
        total_human_messages,
        total_ai_messages,
      } = action.payload
      state.total_messages = total_messages || 0
      state.tool_token = tool_token || 0
      state.total_token = total_token || 0
      state.total_tool_calls = total_tool_calls || 0
      state.total_human_messages = total_human_messages || 0
      state.total_ai_messages = total_ai_messages || 0
    },
    setContextMetadata: (state, action) => {
      const { total_messages, total_tokens } = action.payload
      state.context_total_messages = total_messages || 0
      state.context_total_tokens = total_tokens || 0
    },
    resetThreadSettings: (state) => {
      Object.assign(state, initialState)
    },
  },
})

export const {
  setThreadId,
  setThreadTitle,
  setConfig,
  setInitState,
  setStreamingResponse,
  setShowToolMessageContent,
  setRecursionLimit,
  setResponseGranularity,
  setIncludeRaw,
  updateConfigKey,
  removeConfigKey,
  updateInitStateKey,
  removeInitStateKey,
  setReadonlyData,
  setContextMetadata,
  resetThreadSettings,
} = threadSettingsSlice.actions

export default threadSettingsSlice.reducer
