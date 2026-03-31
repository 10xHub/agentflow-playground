import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  buildMessageText,
  getMessageCopyText,
  hasRenderableMessageContent,
  normalizeTimestamp,
} from "@/lib/messageContent"

describe("messageContent", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("formats reasoning and tool blocks with details", () => {
    const text = buildMessageText(
      [
        { type: "reasoning", summary: "Need to inspect state" },
        { type: "tool_call", name: "search", args: { query: "state" } },
        { type: "tool_result", output: { ok: true } },
      ],
      { showToolDetails: true }
    )

    expect(text).toContain("**Reasoning**")
    expect(text).toContain("`search`")
    expect(text).toContain('"query": "state"')
    expect(text).toContain('"ok": true')
  })

  it("uses fallback metadata and hidden tool labels when details are off", () => {
    const text = buildMessageText(
      [{ type: "tool_call" }, { type: "tool_result", result: { value: 1 } }],
      {
        metadata: { function_name: "invokeGraph", function_argument: "{}" },
        toolCalls: [
          {
            function: {
              name: "fallbackName",
              arguments: '{"limit":10}',
            },
          },
        ],
      }
    )

    expect(text).toContain("**Tool Call**")
    expect(text).toContain("**Tool Result**")
    expect(text).toContain("`invokeGraph`")
    expect(text).not.toContain("```json")
  })

  it("handles empty and string content", () => {
    expect(buildMessageText("plain text")).toBe("plain text")
    expect(buildMessageText(null, { reasoning: "Fallback" })).toBe("Fallback")
    expect(hasRenderableMessageContent([], { reasoning: "Fallback" })).toBe(
      true
    )
    expect(hasRenderableMessageContent([], {})).toBe(false)
  })

  it("normalizes timestamps from seconds, milliseconds, and invalid values", () => {
    expect(normalizeTimestamp(1_704_067_200)).toBe("2024-01-01T00:00:00.000Z")
    expect(normalizeTimestamp(1_704_067_200_000)).toBe(
      "2024-01-01T00:00:00.000Z"
    )
    expect(normalizeTimestamp("invalid-date")).toBe("2026-01-01T00:00:00.000Z")
    expect(normalizeTimestamp()).toBe("2026-01-01T00:00:00.000Z")
  })

  it("builds copy text from raw content and metadata", () => {
    const text = getMessageCopyText(
      {
        rawContent: [{ type: "tool_call", args: { foo: "bar" } }],
        metadata: { tool_name: "custom-tool" },
      },
      { showToolDetails: true }
    )

    expect(text).toContain("`custom-tool`")
    expect(text).toContain('"foo": "bar"')
  })
})
