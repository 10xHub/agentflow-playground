import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import CaseDetail from "./case-detail"

const base = {
  id: "c1",
  name: "Refund",
  type: "eval",
  status: "fail",
  error: null,
  input: "I want a refund",
  expected: "summary line",
  expected_detail: null,
  actual: "No refund",
  lat: "1s",
  cost: "10 tok",
  rubric: null,
}

describe("CaseDetail", () => {
  it("shows the case error text for an errored case", () => {
    render(
      <CaseDetail
        activeCase={{ ...base, status: "error", error: "tool crashed" }}
        threshold={0.8}
      />
    )
    expect(screen.getByText("error")).toBeTruthy()
    expect(screen.getByText("tool crashed")).toBeTruthy()
  })

  it("renders criterion kind, pass state, threshold, details and error", () => {
    const rubric = [
      {
        key: "tool_name_match",
        value: 0.5,
        tone: "danger",
        kind: "criterion",
        passed: false,
        threshold: 0.8,
        details: { reason: "wrong tool" },
        error: null,
      },
      {
        key: "judge",
        value: 0,
        tone: "danger",
        kind: "criterion",
        passed: false,
        threshold: null,
        details: null,
        error: "judge timed out",
      },
      {
        key: "weighted score",
        value: 0.25,
        tone: "danger",
        kind: "summary",
        passed: null,
        threshold: null,
        details: null,
        error: null,
      },
    ]
    render(<CaseDetail activeCase={{ ...base, rubric }} threshold={0.8} />)
    expect(screen.getByText("wrong tool")).toBeTruthy()
    expect(screen.getByText("judge timed out")).toBeTruthy()
    expect(screen.getByText(/threshold 0\.80/)).toBeTruthy()
    expect(screen.getAllByText("failed")).toHaveLength(2)
    // The summary row has no pass state.
    expect(screen.getByText("weighted score")).toBeTruthy()
  })

  it("renders the Expected column from expected_detail", () => {
    render(
      <CaseDetail
        activeCase={{
          ...base,
          expected_detail: {
            response: "Refund issued",
            tool_trajectory: [{ name: "refund_order", args: { id: 1 } }],
            node_order: ["agent", "tools"],
          },
        }}
        threshold={0.8}
      />
    )
    expect(screen.getByText("Refund issued")).toBeTruthy()
    expect(screen.getByText(/refund_order/)).toBeTruthy()
    expect(screen.getByText("agent > tools")).toBeTruthy()
    expect(screen.queryByText("summary line")).toBeNull()
  })

  it("falls back to the one-line expected text", () => {
    render(<CaseDetail activeCase={base} threshold={0.8} />)
    expect(screen.getByText("summary line")).toBeTruthy()
  })
})
