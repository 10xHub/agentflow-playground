import { describe, expect, it } from "vitest"

import { searchLocally } from "@/lib/demo/local-search"

const mem = (id, content) => ({ id, content, score: 0, metadata: {} })
const all = [
  mem("1", "Customer c_88 prefers email"),
  mem("2", "Order 1042 arrived broken"),
]

describe("searchLocally", () => {
  it("ranks by matched words and scores between 0 and 1", () => {
    const [hit] = searchLocally(all, "email preference")
    expect(hit.id).toBe("1")
    expect(hit.score).toBeGreaterThan(0)
    expect(hit.score).toBeLessThanOrEqual(1)
  })

  it("returns an empty list for no match or a blank query", () => {
    expect(searchLocally(all, "zebra")).toEqual([])
    expect(searchLocally(all, "   ")).toEqual([])
  })

  it("does not change the memories it was given", () => {
    searchLocally(all, "email")
    expect(all[0].score).toBe(0)
  })
})
