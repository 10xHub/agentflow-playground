import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { TenxGraphClientMock } = vi.hoisted(() => ({
  TenxGraphClientMock: vi.fn(function MockTenxGraphClient(options) {
    this.options = options
  }),
}))

vi.mock("10xgraph-client", () => ({
  TenxGraphClient: TenxGraphClientMock,
}))

const { loadedFixture } = vi.hoisted(() => ({ loadedFixture: { current: null } }))

vi.mock("@/lib/demo/fixtures", () => ({
  getLoadedFixture: () => loadedFixture.current,
}))

import { DemoClient } from "@/lib/demo/demo-client"
import { enterDemo, exitDemo } from "@/lib/demo/demo-mode"
import fixture from "@/lib/demo/test-fixture"
import {
  getTenxGraphClient,
  resetTenxGraphClient,
  validateAndNormalizeUrl,
} from "@/lib/tenxgraph-client"

const SETTINGS_STORAGE_KEY = "10xgraph.settings"

describe("tenxgraph-client", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    resetTenxGraphClient()
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

    const client = getTenxGraphClient()

    expect(TenxGraphClientMock).toHaveBeenCalledWith({
      baseUrl: "https://example.com",
      auth: {
        type: "bearer",
        token: "secret-token",
      },
      timeout: 600000,
      debug: false,
    })
    expect(client).toBeInstanceOf(TenxGraphClientMock)
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

    const firstClient = getTenxGraphClient()
    const secondClient = getTenxGraphClient()

    expect(firstClient).toBe(secondClient)
    expect(TenxGraphClientMock).toHaveBeenCalledTimes(1)
  })

  it("rebuilds the client when the stored settings change", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        backendUrl: "https://example.com/",
        authMode: "none",
      })
    )
    const firstClient = getTenxGraphClient()

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
    const secondClient = getTenxGraphClient()

    expect(firstClient).not.toBe(secondClient)
    expect(TenxGraphClientMock).toHaveBeenCalledTimes(2)
  })

  it("omits auth when it is missing", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        backendUrl: "https://example.com/",
      })
    )

    getTenxGraphClient()

    expect(TenxGraphClientMock).toHaveBeenCalledWith(
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

    getTenxGraphClient()

    expect(TenxGraphClientMock).toHaveBeenCalledWith({
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

    getTenxGraphClient()

    expect(TenxGraphClientMock).toHaveBeenCalledWith({
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

    getTenxGraphClient()

    expect(TenxGraphClientMock).toHaveBeenCalledWith(
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

    getTenxGraphClient()

    expect(TenxGraphClientMock).toHaveBeenCalledWith(
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

    getTenxGraphClient()

    expect(TenxGraphClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { type: "header", name: "X-API-Key", value: "secret-key", prefix: null },
        headers: { "X-Tenant-Id": "acme" },
      })
    )
  })

  it("throws when the backend URL is not configured", () => {
    expect(() => getTenxGraphClient()).toThrow("Backend URL is not set")
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

  describe("in demo mode", () => {
    beforeEach(() => {
      loadedFixture.current = null
      enterDemo("support")
    })

    afterEach(() => {
      exitDemo()
    })

    it("refuses until the fixture has loaded, without building a real client", () => {
      expect(() => getTenxGraphClient()).toThrow("Demo data is still loading")
      expect(TenxGraphClientMock).not.toHaveBeenCalled()
    })

    it("returns the same DemoClient even when a real backend is saved", () => {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ backendUrl: "http://mine:8000" })
      )
      loadedFixture.current = fixture

      const client = getTenxGraphClient()

      expect(client).toBeInstanceOf(DemoClient)
      expect(getTenxGraphClient()).toBe(client)
      expect(TenxGraphClientMock).not.toHaveBeenCalled()
    })
  })
})
