// Ties the demo copy (callouts.js and the agent's scripted answers) to the
// recording. If a re-record contradicts a claim, this fails instead of the
// demo quietly saying something untrue.
import { describe, expect, it } from "vitest"

import fixture from "@/demo/fixtures/support.json"
import { DEMO_TRACE_THREAD } from "@/lib/demo/callouts"

const run = (id) => fixture.runs.find((r) => r.id === id)

const blocks = (r, type) =>
  r.chunks.flatMap(({ chunk }) =>
    (chunk.message?.content ?? []).filter((b) => b.type === type)
  )

const toolResult = (r, name) => {
  const callId = blocks(r, "tool_call").find((b) => b.name === name)?.id
  const result = blocks(r, "tool_result").find((b) => b.call_id === callId)
  const output = result?.output
  const parsed = typeof output === "string" ? JSON.parse(output) : output
  return Array.isArray(parsed) ? parsed[0] : parsed
}

const finalText = (r) => blocks(r, "text").at(-1)?.text ?? ""

describe("demo recording backs the copy", () => {
  it("history: one MAIN step calls both lookups together", () => {
    const step = run("history").chunks.find(
      ({ chunk }) => chunk.message?.tools_calls?.length > 1
    )
    const names = step.chunk.message.tools_calls.map((c) => c.function.name)
    expect(names.toSorted()).toEqual(["get_customer_history", "lookup_order"])
  })

  it("refund: searches memory, then refunds and emails because of it", () => {
    const names = blocks(run("refund"), "tool_call").map((b) => b.name)
    expect(names).toEqual(
      expect.arrayContaining(["memory_tool", "issue_refund", "send_email"])
    )
    expect(names.indexOf("memory_tool")).toBeLessThan(names.indexOf("issue_refund"))
    expect(finalText(run("refund"))).toMatch(/prefers email/)
  })

  it("count: exactly one refund, the one the refund run issued", () => {
    const issued = toolResult(run("refund"), "issue_refund")
    const listed = toolResult(run("count"), "list_refunds")
    expect(listed.count).toBe(1)
    expect(listed.refunds[0].refund_id).toBe(issued.refund_id)
    expect(finalText(run("count"))).toMatch(/1 refund/)
  })

  it("memory: the saved preference is in the store", () => {
    const contents = fixture.memories.list.data.memories.map((m) => m.content)
    expect(contents).toContain("Maya Chen (c_88) prefers email over phone.")
  })

  it("evals: the cancel case is the one failure", () => {
    const [detail] = Object.values(fixture.evals.detail)
    const failed = detail.cases.filter((c) => c.status === "fail")
    expect(failed.map((c) => c.id)).toEqual(["cancel_unshipped_order"])
  })

  it("observability: the default trace thread is recorded", () => {
    expect(fixture.observability[DEMO_TRACE_THREAD].latest.data.run).toBeTruthy()
  })

  it("graph: MAIN calls TOOL or ends; TOOL hands back to MAIN; Postgres checkpointer", () => {
    const { info, edges } = fixture.graph.data
    const pairs = edges.map((e) => `${e.source}>${e.target}`).toSorted()
    expect(pairs).toEqual(["MAIN>TOOL", "MAIN>__end__", "TOOL>MAIN", "__start__>MAIN"])
    expect(info.checkpointer_type).toBe("PgCheckpointer")
    expect(info.store).toBe(true)
  })

  it("threads: the refund thread holds two runs", () => {
    expect(fixture.observability["demo-refund"].latest.data.run_count).toBe(2)
  })
})
