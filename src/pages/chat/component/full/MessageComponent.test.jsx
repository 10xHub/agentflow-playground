import { configureStore } from "@reduxjs/toolkit"
import { render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"

import threadSettingsReducer from "@/services/store/slices/thread-settings.slice"

import Message from "./MessageComponent"

const createTestStore = (showToolMessageContent) =>
  configureStore({
    reducer: {
      threadSettingsStore: threadSettingsReducer,
    },
    preloadedState: {
      threadSettingsStore: {
        thread_id: null,
        thread_title: "",
        config: {},
        init_state: {},
        streaming_response: false,
        show_tool_message_content: showToolMessageContent,
        recursion_limit: 25,
        response_granularity: "low",
        include_raw: false,
        context_total_messages: 0,
        context_total_tokens: 0,
        total_messages: 0,
        total_tokens: 0,
        total_tool_calls: 0,
        total_human_messages: 0,
        total_ai_messages: 0,
      },
    },
  })

const TOOL_MESSAGE = {
  id: "tool-1",
  role: "tool",
  timestamp: new Date().toISOString(),
  content: "",
  rawContent: [
    {
      type: "tool_result",
      call_id: "call-1",
      output: [{ location: "khulna", temperature: "25C" }],
      status: "completed",
    },
  ],
  metadata: {
    function_name: "get_weather",
  },
}

const renderMessage = (showToolMessageContent) =>
  render(
    <Provider store={createTestStore(showToolMessageContent)}>
      <Message message={TOOL_MESSAGE} />
    </Provider>
  )

describe("MessageComponent", () => {
  it("shows only the function name when tool details are disabled", () => {
    renderMessage(false)

    expect(screen.getByText("get_weather")).toBeInTheDocument()
    expect(screen.queryByText(/temperature/i)).not.toBeInTheDocument()
  })

  it("shows full tool output when tool details are enabled", () => {
    renderMessage(true)

    expect(screen.getByText("get_weather")).toBeInTheDocument()
    expect(screen.getByText(/temperature/i)).toBeInTheDocument()
  })
})
