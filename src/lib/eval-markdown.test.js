import { describe, expect, it } from "vitest"

import { buildEvalMarkdown, evalMarkdownName } from "./eval-markdown"

const detail = {
  title: "Refund flows · run #2",
  sub: "set-1 · gpt-4o-mini",
  rate: 66.7,
  status: "fail",
  threshold: 80,
  counts: { total: 3, passed: 1, failed: 1, errored: 1 },
  cases: [
    {
      id: "a",
      name: "ok | case",
      status: "pass",
      score: 1,
      lat: "1.0s",
      cost: "10 tok",
    },
    {
      id: "b",
      name: "wrong tool",
      status: "fail",
      score: 0.5,
      lat: "2.0s",
      cost: "20 tok",
      input: "refund me",
      expected: "tools: refund",
      actual: "no",
      rubric: [
        {
          key: "tool_name_match_score",
          value: 0.5,
          kind: "criterion",
          passed: false,
          threshold: 0.8,
          details: { reason: "wrong tool" },
        },
        { key: "weighted score", value: 0.5, kind: "summary", passed: null },
      ],
    },
    {
      id: "c",
      name: "crashed",
      status: "error",
      score: 0,
      lat: "0.1s",
      cost: "0 tok",
      input: "x",
      expected: "-",
      actual: "-",
      error: "boom",
      rubric: null,
    },
  ],
}

describe("buildEvalMarkdown", () => {
  const md = buildEvalMarkdown(detail)

  it("opens with the title, pass rate and counts", () => {
    expect(md).toMatch(/^# Refund flows · run #2\n/)
    expect(md).toContain("Pass rate: 66.7% (threshold 80%), FAIL")
    expect(md).toContain("Cases: 3, passed 1, failed 1, errored 1")
  })

  it("lists every case and escapes pipes", () => {
    expect(md).toContain("| ok \\| case | PASS | 1.00 | 1.0s | 10 tok |")
    expect(md).toContain("| wrong tool | FAIL | 0.50 | 2.0s | 20 tok |")
    expect(md).toContain("| crashed | ERROR | 0.00 | 0.1s | 0 tok |")
  })

  it("explains failures and errors but not passes or summary rows", () => {
    expect(md).toContain("### wrong tool (fail)")
    expect(md).toContain("- Expected: tools: refund")
    expect(md).toContain(
      "- tool_name_match_score: scored 0.5 (threshold 0.8), wrong tool"
    )
    expect(md).toContain("### crashed (error)")
    expect(md).toContain("- Error: boom")
    expect(md).not.toContain("### ok | case")
    expect(md).not.toContain("weighted score: scored")
  })

  it("includes expected tool args and node order from the summary", () => {
    const withArgs = {
      ...detail.cases[1],
      expected: 'ok; tools: refund({"order":7}); nodes: MAIN',
    }
    const out = buildEvalMarkdown({ ...detail, cases: [withArgs] })
    expect(out).toContain(
      '- Expected: ok; tools: refund({"order":7}); nodes: MAIN'
    )
  })

  it("says so when nothing failed", () => {
    const clean = buildEvalMarkdown({ ...detail, cases: [detail.cases[0]] })
    expect(clean).toContain("No failures.")
  })
})

describe("evalMarkdownName", () => {
  it("makes a file-safe name", () => {
    expect(evalMarkdownName(detail)).toBe("refund-flows-run-2.md")
  })
})
