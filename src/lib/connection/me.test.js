import { afterEach, describe, expect, it, vi } from "vitest"

import { can, fetchMe, parseMe } from "./me"

const body = (data) => ({ ok: true, json: async () => ({ data }) })

describe("can", () => {
  it("allows everything with no identity (auth off or unknown)", () => {
    expect(can(null, "threads:delete")).toBe(true)
  })

  it("matches exact, resource wildcard and global wildcard", () => {
    const me = (permissions) => ({ permissions })
    expect(can(me(["threads:read"]), "threads:read")).toBe(true)
    expect(can(me(["threads:read"]), "threads:delete")).toBe(false)
    expect(can(me(["threads:*"]), "threads:delete")).toBe(true)
    expect(can(me(["threads:*"]), "graph:stop")).toBe(false)
    expect(can(me(["*"]), "graph:stop")).toBe(true)
    expect(can(me([]), "graph:stop")).toBe(false)
  })
})

describe("parseMe", () => {
  it("returns null for auth off and unknown shapes", () => {
    expect(parseMe({ auth: "off" })).toBeNull()
    expect(parseMe(undefined)).toBeNull()
    expect(parseMe({ user_id: "u" })).toBeNull()
  })

  it("maps the server fields", () => {
    expect(
      parseMe({
        user_id: "u1",
        tenant: { org: "a" },
        roles: ["viewer"],
        permissions: ["threads:read"],
        reach: "tenant",
      })
    ).toEqual({
      userId: "u1",
      tenant: { org: "a" },
      roles: ["viewer"],
      permissions: ["threads:read"],
      reach: "tenant",
    })
  })
})

describe("fetchMe", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("reads /v1/me with the connection credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      body({
        user_id: "u1",
        roles: [],
        permissions: ["*"],
        reach: "all",
      })
    )
    vi.stubGlobal("fetch", fetchMock)
    const me = await fetchMe({ baseUrl: "http://x", authToken: "tok" })
    expect(me.userId).toBe("u1")
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("http://x/v1/me")
    expect(init.headers.Authorization).toBe("Bearer tok")
  })

  it("returns null on 404 (older server) and on network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 })
    )
    expect(await fetchMe({ baseUrl: "http://x" })).toBeNull()
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("down")))
    expect(await fetchMe({ baseUrl: "http://x" })).toBeNull()
  })
})
