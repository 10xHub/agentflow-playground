import { afterEach, describe, expect, it, vi } from "vitest"

import {
  isLocalNetworkUrl,
  isNetworkFailure,
  probeLocalNetwork,
  queryLocalNetworkPermission,
} from "./local-network"

describe("isLocalNetworkUrl", () => {
  it.each([
    "http://localhost:8000",
    "http://app.localhost:3000",
    "http://127.0.0.1:8000",
    "http://127.5.5.5",
    "http://[::1]:8000",
    "http://0.0.0.0:8000",
    "http://10.1.2.3",
    "http://172.16.0.1",
    "http://172.31.255.1",
    "http://192.168.1.20:8000",
    "http://169.254.1.1",
    "http://[fe80::1]:8000",
    "http://[fd12:3456::1]:8000",
  ])("is true for %s", (url) => {
    expect(isLocalNetworkUrl(url)).toBe(true)
  })

  it.each([
    "https://api.example.com",
    "http://172.32.0.1",
    "http://172.15.0.1",
    "http://11.0.0.1",
    "http://192.169.1.1",
    "https://notlocalhost.com",
    "not a url",
    "",
  ])("is false for %s", (url) => {
    expect(isLocalNetworkUrl(url)).toBe(false)
  })
})

describe("isNetworkFailure", () => {
  it("is true for a fetch TypeError and false for timeouts and HTTP errors", () => {
    expect(isNetworkFailure(new TypeError("Failed to fetch"))).toBe(true)
    expect(
      isNetworkFailure(Object.assign(new Error("x"), { name: "AbortError" }))
    ).toBe(false)
    expect(
      isNetworkFailure(Object.assign(new Error("Forbidden"), { status: 403 }))
    ).toBe(false)
  })
})

describe("queryLocalNetworkPermission", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("tries the specific name, then the alias, and returns the state", async () => {
    const query = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("unknown name"))
      .mockResolvedValueOnce({ state: "denied" })
    vi.stubGlobal("navigator", { permissions: { query } })
    await expect(
      queryLocalNetworkPermission("http://localhost:8000")
    ).resolves.toBe("denied")
    expect(query.mock.calls.map((c) => c[0].name)).toEqual([
      "loopback-network",
      "local-network-access",
    ])
  })

  it("uses local-network for private addresses", async () => {
    const query = vi.fn().mockResolvedValue({ state: "prompt" })
    vi.stubGlobal("navigator", { permissions: { query } })
    await queryLocalNetworkPermission("http://192.168.1.5:8000")
    expect(query.mock.calls[0][0].name).toBe("local-network")
  })

  it("returns null when unsupported or every name throws", async () => {
    vi.stubGlobal("navigator", {})
    await expect(
      queryLocalNetworkPermission("http://localhost")
    ).resolves.toBeNull()
    vi.stubGlobal("navigator", {
      permissions: { query: vi.fn().mockRejectedValue(new TypeError("no")) },
    })
    await expect(
      queryLocalNetworkPermission("http://localhost")
    ).resolves.toBeNull()
  })
})

describe("probeLocalNetwork", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("sends one credential-free GET to /ping and ignores the result", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal("fetch", fetchMock)
    await expect(probeLocalNetwork("http://localhost:8000/")).resolves.toBe(
      "ok"
    )
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/ping")
    expect(fetchMock.mock.calls[0][1].credentials).toBe("omit")
    expect(fetchMock.mock.calls[0][1].headers).toBeUndefined()
  })

  it("reports blocked on a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    )
    await expect(probeLocalNetwork("http://localhost:8000")).resolves.toBe(
      "blocked"
    )
  })
})
