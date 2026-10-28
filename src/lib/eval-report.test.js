import { describe, expect, it } from "vitest"

import sample from "@/demo/sample-eval-report.json"

import {
  assertEvalReport,
  buildEvalRuns,
  formatAgo,
  parseEvalReport,
} from "./eval-report"

const usage = { total_tokens: 1500 }

const criterion = (over = {}) => ({
  criterion: "tool_name_match_score",
  score: 1,
  passed: true,
  threshold: 0.8,
  details: {},
  error: null,
  ...over,
})

const result = (over = {}) => ({
  eval_id: "c1",
  name: "Case one",
  passed: true,
  criterion_results: [criterion()],
  actual_response: "done",
  messages: [{ role: "user", content: "hello" }],
  duration_seconds: 1.234,
  error: null,
  metadata: {},
  token_usage: usage,
  ...over,
})

const report = (results, over = {}) => ({
  eval_set_id: "set-1",
  eval_set_name: "Refund flows",
  results,
  summary: {
    total_cases: results.length,
    passed_cases: results.filter((r) => r.passed).length,
    failed_cases: results.filter((r) => !r.passed && r.error == null).length,
    error_cases: results.filter((r) => r.error != null).length,
    pass_rate: 0.5,
    avg_duration_seconds: 1.2,
    total_duration_seconds: 2.4,
    total_token_usage: usage,
  },
  config_used: { model: "gpt-4o-mini" },
  timestamp: 1_700_000_000,
  ...over,
})

const NOW = 1_700_000_000 + 300

describe("parseEvalReport", () => {
  it("returns the report keyed by file name", () => {
    const parsed = parseEvalReport(JSON.stringify(report([result()])), "a.json")
    expect(parsed.id).toBe("a.json")
    expect(parsed.report.eval_set_id).toBe("set-1")
  })

  it("rejects text that is not JSON", () => {
    expect(() => parseEvalReport("nope", "a.json")).toThrow(
      "a.json is not valid JSON."
    )
  })

  it("rejects JSON that is not an eval report", () => {
    expect(() => assertEvalReport({ foo: 1 }, "x.json")).toThrow(
      /x\.json is not an eval report/
    )
    expect(() => assertEvalReport([], "x.json")).toThrow(/not an eval report/)
    expect(() => assertEvalReport(null, "x.json")).toThrow(/not an eval report/)
  })
})

describe("buildEvalRuns", () => {
  it("builds a run row and drilldown header", () => {
    const { runs, details } = buildEvalRuns(
      [
        {
          id: "a",
          report: report([result(), result({ eval_id: "c2", passed: false })]),
        },
      ],
      NOW
    )
    expect(runs).toEqual([
      {
        id: "a",
        name: "Refund flows",
        run: "#1",
        rate: 50,
        status: "fail",
        cases: 2,
        errors: 0,
        ago: "5m ago",
      },
    ])
    expect(details.a.title).toBe("Refund flows · run #1")
    expect(details.a.sub).toBe("set-1 · gpt-4o-mini · 2023-11-14 22:13 · 2.4s")
    expect(details.a.threshold).toBe(80)
    expect(details.a.counts).toEqual({
      total: 2,
      passed: 1,
      failed: 1,
      errored: 0,
    })
    expect(details.a.regression).toBeNull()
    expect(details.a.stats.find((s) => s.label === "total tokens").value).toBe(
      "1.5k tok"
    )
  })

  it("marks a case with an error as error and keeps the error text", () => {
    const errored = result({
      passed: false,
      error: "boom",
      criterion_results: [],
    })
    const { details, runs } = buildEvalRuns(
      [{ id: "a", report: report([errored]) }],
      NOW
    )
    const [c] = details.a.cases
    expect(c.status).toBe("error")
    expect(c.error).toBe("boom")
    expect(c.rubric).toBeNull()
    expect(c.score).toBe(0)
    expect(runs[0].errors).toBe(1)
    const errStat = details.a.stats.find((s) => s.label === "errors")
    expect(errStat.tone).toBe("bad")
  })

  it("builds rubric rows with details, threshold, error and a summary row", () => {
    const failing = result({
      passed: false,
      criterion_results: [
        criterion({
          score: 0.5,
          passed: false,
          details: { reason: "wrong tool" },
        }),
        criterion({
          criterion: "judge",
          score: 0,
          passed: false,
          error: "timeout",
        }),
      ],
    })
    const { details } = buildEvalRuns(
      [{ id: "a", report: report([failing]) }],
      NOW
    )
    const rubric = details.a.cases[0].rubric
    expect(rubric).toHaveLength(3)
    expect(rubric[0]).toMatchObject({
      key: "tool_name_match_score",
      value: 0.5,
      tone: "danger",
      kind: "criterion",
      passed: false,
      threshold: 0.8,
      details: { reason: "wrong tool" },
      error: null,
    })
    expect(rubric[1].details).toBeNull()
    expect(rubric[1].error).toBe("timeout")
    expect(rubric[2]).toMatchObject({
      key: "weighted score",
      kind: "summary",
      value: 0.25,
    })
  })

  it("derives expected values from criterion details", () => {
    const c = result({
      criterion_results: [
        criterion({
          details: {
            expected_response: "Refund issued",
            expected_names: ["refund"],
          },
        }),
        criterion({ details: { expected_node_order: ["agent", "tools"] } }),
      ],
    })
    const { details } = buildEvalRuns([{ id: "a", report: report([c]) }], NOW)
    const built = details.a.cases[0]
    expect(built.expected_detail).toEqual({
      response: "Refund issued",
      tool_trajectory: [{ name: "refund" }],
      node_order: ["agent", "tools"],
    })
    expect(built.expected).toBe(
      "Refund issued; tools: refund; nodes: agent > tools"
    )
  })

  it("has no expectations when no criterion recorded any", () => {
    const { details } = buildEvalRuns(
      [{ id: "a", report: report([result()]) }],
      NOW
    )
    expect(details.a.cases[0].expected_detail).toBeNull()
    expect(details.a.cases[0].expected).toBe("-")
  })

  it("reads the input from list content and splits simulated conversations", () => {
    const sim = result({
      metadata: { turns: 2 },
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "hi" }, { type: "image" }],
        },
      ],
      actual_response: "USER: hi\nAGENT: hello\n\nplain",
    })
    const { details } = buildEvalRuns([{ id: "a", report: report([sim]) }], NOW)
    const built = details.a.cases[0]
    expect(built.type).toBe("sim")
    expect(built.input).toBe("hi")
    expect(built.conversation).toEqual([
      { role: "sim", text: "hi" },
      { role: "agent", text: "hello" },
      { role: "agent", text: "plain" },
    ])
  })

  it("numbers runs per eval set and compares against the previous run", () => {
    const older = report([result(), result({ eval_id: "c2", name: "Two" })], {
      timestamp: 1_700_000_000,
      summary: { ...report([]).summary, pass_rate: 1, total_cases: 2 },
    })
    const newer = report(
      [
        result({
          passed: false,
          criterion_results: [criterion({ score: 0, passed: false })],
        }),
        result({ eval_id: "c2", name: "Two" }),
        result({ eval_id: "c3", name: "New only" }),
      ],
      {
        timestamp: 1_700_000_100,
        summary: { ...report([]).summary, pass_rate: 0.5, total_cases: 3 },
      }
    )
    const { runs, details } = buildEvalRuns(
      [
        { id: "new.json", report: newer },
        { id: "old.json", report: older },
      ],
      NOW
    )
    expect(runs.map((r) => [r.id, r.run])).toEqual([
      ["new.json", "#2"],
      ["old.json", "#1"],
    ])
    expect(details["old.json"].regression).toBeNull()
    const reg = details["new.json"].regression
    expect(reg.note.current).toBe("run #2 (50.0%)")
    expect(reg.note.prev).toBe("run #1 (100.0%)")
    expect(reg.summary).toEqual([
      { label: "pass-rate drift", value: "-50.0pp", tone: "bad" },
      { label: "newly failing", value: "1", tone: "bad" },
      { label: "newly passing", value: "0", tone: "ok" },
      { label: "avg score drift", value: "-0.33", tone: "warn" },
    ])
    expect(reg.rows).toHaveLength(2)
    expect(reg.rows[0]).toMatchObject({
      name: "Case one",
      dir: "down",
      flip: "pass → fail",
      stay: false,
      delta: "1.00 → 0.00  ▼1.00",
    })
    expect(reg.rows[1]).toMatchObject({
      dir: "flat",
      flip: "pass (same)",
      stay: true,
    })
  })

  it("does not compare reports of different eval sets", () => {
    const other = report([result()], {
      eval_set_id: "set-2",
      timestamp: 1_700_000_100,
    })
    const { details } = buildEvalRuns(
      [
        { id: "a", report: report([result()]) },
        { id: "b", report: other },
      ],
      NOW
    )
    expect(details.b.regression).toBeNull()
  })

  it("parses the bundled sample report", () => {
    const { runs, details } = buildEvalRuns([{ id: "s", report: sample }], NOW)
    expect(runs).toHaveLength(1)
    const failed = details.s.cases.filter((c) => c.status !== "pass")
    expect(failed.map((c) => c.id)).toEqual(["cancel_unshipped_order"])
    expect(failed[0].rubric[0].details.reason).toMatch(/cancel_order/)
  })
})

describe("formatAgo", () => {
  it("steps through minutes, hours and days", () => {
    expect(formatAgo(100, 130)).toBe("just now")
    expect(formatAgo(0, 120)).toBe("2m ago")
    expect(formatAgo(0, 7200)).toBe("2h ago")
    expect(formatAgo(0, 86400 * 3)).toBe("3d ago")
  })
})
