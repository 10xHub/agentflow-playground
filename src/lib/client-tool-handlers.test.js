import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  CLIENT_TOOLS_KEY,
  readStoredClientTools,
  registerStoredTools,
} from "@/lib/client-tool-handlers"

const store = (tools) =>
  localStorage.setItem(CLIENT_TOOLS_KEY, JSON.stringify(tools))

describe("registerStoredTools", () => {
  beforeEach(() => localStorage.clear())

  it("registers only tools marked registered", async () => {
    store([
      {
        id: "1",
        name: "a",
        registered: true,
        callMode: "mock",
        mock: '{"x":1}',
      },
      { id: "2", name: "b", registered: false },
    ])
    const client = { registerToolHandler: vi.fn() }
    registerStoredTools(client)
    expect(client.registerToolHandler).toHaveBeenCalledTimes(1)
    const [name, handler] = client.registerToolHandler.mock.calls[0]
    expect(name).toBe("a")
    expect(await handler({})).toEqual({ x: 1 })
  })

  it("runs a handler-mode tool's code", async () => {
    store([
      {
        id: "1",
        name: "double",
        registered: true,
        callMode: "handler",
        code: "function double({ n }) { return n * 2 }",
      },
    ])
    const client = { registerToolHandler: vi.fn() }
    registerStoredTools(client)
    expect(await client.registerToolHandler.mock.calls[0][1]({ n: 4 })).toBe(8)
  })

  it("tolerates empty or corrupt storage", () => {
    expect(readStoredClientTools()).toEqual([])
    localStorage.setItem(CLIENT_TOOLS_KEY, "{not json")
    expect(readStoredClientTools()).toEqual([])
    const client = { registerToolHandler: vi.fn() }
    registerStoredTools(client)
    expect(client.registerToolHandler).not.toHaveBeenCalled()
  })
})
