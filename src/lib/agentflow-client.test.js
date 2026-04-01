import { beforeEach, describe, expect, it, vi } from "vitest"

const { AgentFlowClientMock } = vi.hoisted(() => ({
  AgentFlowClientMock: vi.fn(function MockAgentFlowClient(options) {
    this.options = options
  }),
}))

vi.mock("@10xscale/agentflow-client", () => ({
  AgentFlowClient: AgentFlowClientMock,
}))

import {
  getAgentFlowClient,
  resetAgentFlowClient,
  validateAndNormalizeUrl,
} from "@/lib/agentflow-client"

describe("agentflow-client", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    resetAgentFlowClient()
  })

  it("creates a client with normalized settings", () => {
    localStorage.setItem("backendUrl", " https://example.com/ ")
    localStorage.setItem("authToken", "secret-token")

    const client = getAgentFlowClient()

    expect(AgentFlowClientMock).toHaveBeenCalledWith({
      baseUrl: "https://example.com",
      authToken: "secret-token",
      timeout: 600000,
      debug: false,
    })
    expect(client).toBeInstanceOf(AgentFlowClientMock)
  })

  it("returns the same client instance for repeated calls with unchanged settings", () => {
    localStorage.setItem("backendUrl", "https://example.com/")
    localStorage.setItem("authToken", "secret-token")

    const firstClient = getAgentFlowClient()
    const secondClient = getAgentFlowClient()

    expect(firstClient).toBe(secondClient)
    expect(AgentFlowClientMock).toHaveBeenCalledTimes(1)
  })

  it("rebuilds the client when the stored settings change", () => {
    localStorage.setItem("backendUrl", "https://example.com/")
    const firstClient = getAgentFlowClient()

    localStorage.setItem("authToken", "new-token")
    const secondClient = getAgentFlowClient()

    expect(firstClient).not.toBe(secondClient)
    expect(AgentFlowClientMock).toHaveBeenCalledTimes(2)
  })

  it("omits the auth token when it is missing", () => {
    localStorage.setItem("backendUrl", "https://example.com/")

    getAgentFlowClient()

    expect(AgentFlowClientMock).toHaveBeenCalledWith(
      expect.objectContaining({ authToken: undefined })
    )
  })

  it("throws when the backend URL is not configured", () => {
    expect(() => getAgentFlowClient()).toThrow("Backend URL is not set")
  })

  it("validates and normalizes URLs", () => {
    expect(validateAndNormalizeUrl(" https://example.com/path/ ")).toBe(
      "https://example.com/path"
    )
  })

  it("rejects empty or malformed URLs", () => {
    expect(() => validateAndNormalizeUrl("")).toThrow("Backend URL is required")
    expect(() => validateAndNormalizeUrl("example.com")).toThrow(
      "Backend URL must start with http:// or https://"
    )
    expect(() => validateAndNormalizeUrl("https:// bad-url")).toThrow(
      "Invalid backend URL format"
    )
  })
})
