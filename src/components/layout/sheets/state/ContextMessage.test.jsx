/* eslint-disable react/jsx-handler-names */
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import ContextMessage from "./ContextMessage"

describe("ContextMessage", () => {
  it("renders structured message content without crashing", () => {
    const handleUpdate = vi.fn()
    const handleRemove = vi.fn()

    render(
      <ContextMessage
        message={{
          message_id: "msg-1",
          role: "assistant",
          content: [
            {
              type: "reasoning",
              summary: "Need to call the weather tool.",
            },
            {
              type: "tool_call",
              name: "get_weather",
              args: { location: "khulna" },
            },
          ],
        }}
        index={0}
        onUpdate={handleUpdate}
        handleRemove={handleRemove}
      />
    )

    expect(
      screen.getAllByText(/Need to call the weather tool/i).length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(/get_weather/i).length).toBeGreaterThan(0)
  })
})
