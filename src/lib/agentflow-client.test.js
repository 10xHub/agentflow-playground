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

const SETTINGS_STORAGE_KEY = "pyagenity-settings"

describe("agentflow-client", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    resetAgentFlowClient()
  })

  it("creates a client with normalized settings", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        backendUrl: " https://example.com/ ",
        authMode: "bearer",
        authToken: "secret-token",
      })
    )

    const client = getAgentFlowClient()

    expect(AgentFlowClientMock).toHaveBeenCalledWith({
      baseUrl: "https://example.com",
      auth: {
        type: "bearer",
        token: "secret-token",
      },
      timeout: 600000,
      debug: false,
    })
    expect(client).toBeInstanceOf(AgentFlowClientMock)
  })

  it("returns the same client instance for repeated calls with unchanged settings", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        backendUrl: "https://example.com/",
        authMode: "bearer",
        authToken: "secret-token",
      })
    )

    const firstClient = getAgentFlowClient()
    const secondClient = getAgentFlowClient()

    expect(firstClient).toBe(secondClient)
    expect(AgentFlowClientMock).toHaveBeenCalledTimes(1)
  })

  it("rebuilds the client when the stored settings change", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        backendUrl: "https://example.com/",
        authMode: "none",
      })
    )
    const firstClient = getAgentFlowClient()

    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        backendUrl: "https://example.com/",
        authMode: "header",
        auth: {
          type: "header",
          name: "X-API-Key",
          value: "new-token",
        },
      })
    )
    const secondClient = getAgentFlowClient()

    expect(firstClient).not.toBe(secondClient)
    expect(AgentFlowClientMock).toHaveBeenCalledTimes(2)
  })

  it("omits auth when it is missing", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        backendUrl: "https://example.com/",
      })
    )

    getAgentFlowClient()

    expect(AgentFlowClientMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ auth: expect.anything() })
    )
  })

  it("builds basic auth and credentials when configured", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        backendUrl: "https://example.com/",
        authMode: "basic",
        auth: {
          type: "basic",
          username: "service-user",
          password: "service-pass",
        },
        credentials: "include",
      })
    )

    getAgentFlowClient()

    expect(AgentFlowClientMock).toHaveBeenCalledWith({
      baseUrl: "https://example.com",
      auth: {
        type: "basic",
        username: "service-user",
        password: "service-pass",
      },
      credentials: "include",
      timeout: 600000,
      debug: false,
    })
  })

  it("falls back to legacy bearer token storage", () => {
    localStorage.setItem("backendUrl", "https://example.com/")
    localStorage.setItem("authToken", "secret-token")

    getAgentFlowClient()

    expect(AgentFlowClientMock).toHaveBeenCalledWith({
      baseUrl: "https://example.com",
      auth: {
        type: "bearer",
        token: "secret-token",
      },
      timeout: 600000,
      debug: false,
    })
  })

  it("passes custom headers to the client as an object", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        backendUrl: "https://example.com/",
        authMode: "none",
        headers: [
          { name: "X-Tenant-Id", value: "acme" },
          { name: "X-Trace", value: "123" },
        ],
      })
    )

    getAgentFlowClient()

    expect(AgentFlowClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          "X-Tenant-Id": "acme",
          "X-Trace": "123",
        },
      })
    )
  })

  it("omits headers when no custom headers are configured", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        backendUrl: "https://example.com/",
        authMode: "none",
      })
    )

    getAgentFlowClient()

    expect(AgentFlowClientMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ headers: expect.anything() })
    )
  })

  it("sends custom headers alongside a custom auth header", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        backendUrl: "https://example.com/",
        authMode: "header",
        auth: {
          type: "header",
          name: "X-API-Key",
          value: "secret-key",
        },
        headers: [{ name: "X-Tenant-Id", value: "acme" }],
      })
    )

    getAgentFlowClient()

    expect(AgentFlowClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { type: "header", name: "X-API-Key", value: "secret-key", prefix: null },
        headers: { "X-Tenant-Id": "acme" },
      })
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
