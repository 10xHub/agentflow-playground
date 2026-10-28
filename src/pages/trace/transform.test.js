import { describe, expect, it } from "vitest"

import { buildViewModel } from "./transform"

const run = {
  status: "completed",
  duration_ms: 1000,
  usage: { prompt_tokens: 1500, completion_tokens: 600, total_tokens: 2100 },
  spans: [
    { id: "r", kind: "root", name: "run" },
    {
      id: "a",
      kind: "llm",
      name: "x",
      parent: "r",
      model: "m1",
      input_tokens: 1000,
      output_tokens: 100,
    },
    {
      id: "b",
      kind: "llm",
      name: "y",
      parent: "r",
      model: "m2",
      input_tokens: 500,
      output_tokens: 500,
    },
  ],
  events: [],
}

describe("transform", () => {
  it("per-model cost uses each model's own tokens", () => {
    const rows = buildViewModel(run).cost.byModel.rows
    expect(rows[0][2]).not.toBe(rows[1][2])
    expect(rows[0][2]).toBe("$0.0002")
    expect(rows[1][2]).toBe("$0.0004")
  })

  it("buildStats includes the run status", () => {
    const s = buildViewModel(run).stats.find((x) => x.label === "status")
    expect(s.value).toBe("completed")
  })
})
