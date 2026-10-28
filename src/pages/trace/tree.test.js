import { describe, expect, it } from "vitest"

import { buildTree, defaultRow, visibleRows } from "./tree"

const run = {
  duration_ms: 1000,
  usage: { total_tokens: 150 },
  spans: [
    {
      id: "root",
      name: "graph",
      kind: "root",
      parent: null,
      start_ms: 0,
      duration_ms: 1000,
    },
    {
      id: "s2",
      name: "node: tools",
      kind: "node",
      parent: "root",
      start_ms: 500,
      duration_ms: 200,
      status: "ok",
      visit: 1,
    },
    {
      id: "s1",
      name: "node: agent",
      kind: "node",
      parent: "root",
      start_ms: 0,
      duration_ms: 400,
      status: "ok",
      visit: 1,
    },
    {
      id: "l1",
      name: "llm.generate",
      kind: "llm",
      parent: "s1",
      start_ms: 10,
      duration_ms: 300,
      status: "ok",
      total_tokens: 150,
    },
    {
      id: "t1",
      name: "tool: lookup",
      kind: "tool",
      parent: "s2",
      start_ms: 510,
      duration_ms: 100,
      status: "error",
      error: "boom",
    },
    {
      id: "s3",
      name: "node: agent",
      kind: "node",
      parent: "root",
      start_ms: 800,
      duration_ms: 100,
      visit: 2,
    },
  ],
}

describe("buildTree", () => {
  it("orders depth first by start and nests under parents", () => {
    const { rows } = buildTree(run)
    expect(rows.map((r) => `${r.depth}:${r.id}`)).toEqual([
      "0:root",
      "1:s1",
      "2:l1",
      "1:s2",
      "2:t1",
      "1:s3",
    ])
  })

  it("shows one row per node visit and strips name prefixes", () => {
    const { rows } = buildTree(run)
    expect(rows.filter((r) => r.label === "agent")).toHaveLength(2)
    expect(rows.find((r) => r.id === "t1").label).toBe("lookup")
  })

  it("aligns bars to the run duration", () => {
    const row = buildTree(run).rows.find((r) => r.id === "s2")
    expect(row.left).toBeCloseTo(50)
    expect(row.width).toBeCloseTo(20)
    expect(row.dur).toBe("200ms")
  })

  it("rolls llm tokens up to node, root uses run usage", () => {
    const rows = buildTree(run).rows
    expect(rows.find((r) => r.id === "s1").tokens).toBe(150)
    expect(rows.find((r) => r.id === "s2").tokens).toBeNull()
    expect(rows[0].tokens).toBe(150)
  })

  it("keeps spans with an unknown parent and survives cycles", () => {
    const { rows } = buildTree({
      duration_ms: 10,
      spans: [
        { id: "a", name: "x", kind: "node", parent: "zzz" },
        { id: "b", name: "y", kind: "node", parent: "b" },
      ],
    })
    expect(rows).toHaveLength(2)
  })

  it("handles an old-shape span with no status or inputs", () => {
    const { rows } = buildTree({
      duration_ms: 5,
      spans: [
        {
          id: "root",
          name: "graph",
          kind: "root",
          parent: null,
          start_ms: 0,
          duration_ms: 5,
        },
      ],
    })
    expect(rows[0].status).toBeNull()
  })

  it("is empty without spans", () => {
    expect(buildTree(null).rows).toEqual([])
  })
})

describe("visibleRows / defaultRow", () => {
  it("hides descendants of collapsed rows", () => {
    const { rows } = buildTree(run)
    const ids = visibleRows(rows, new Set(["s1"])).map((r) => r.id)
    expect(ids).toEqual(["root", "s1", "s2", "t1", "s3"])
    expect(visibleRows(rows, new Set(["root"])).map((r) => r.id)).toEqual([
      "root",
    ])
  })

  it("selects the first error span, else the last llm call", () => {
    const { rows } = buildTree(run)
    expect(defaultRow(rows).id).toBe("t1")
    const noErr = buildTree({
      ...run,
      spans: run.spans.filter((s) => s.id !== "t1"),
    })
    expect(defaultRow(noErr.rows).id).toBe("l1")
  })
})
