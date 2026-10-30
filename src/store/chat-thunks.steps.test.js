import { configureStore } from "@reduxjs/toolkit"
import { describe, expect, it, vi } from "vitest"

import { answerIndex, stepViews } from "@/pages/chat/components/agent-steps"
import chatReducer from "@/store/chat-slice"
import { sendMessage } from "@/store/chat-thunks"

const { current } = vi.hoisted(() => ({ current: { client: null } }))
vi.mock("@/lib/tenxgraph-client", () => ({
  getTenxGraphClient: () => current.client,
}))
vi.mock("@/lib/notify", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}))

const text = (t) => ({ type: "text", text: t })
const chunk = (node, content, { delta = false, role = "assistant" } = {}) => ({
  thread_id: "t1",
  event: "message",
  metadata: { node },
  message: { role, delta, content },
})

const run = async (chunks) => {
  current.client = {
    stopGraph: vi.fn(),
    stream: () =>
      (async function* () {
        for (const c of chunks) yield c
      })(),
  }
  const store = configureStore({
    reducer: { chat: chatReducer },
    middleware: (gdm) => gdm({ serializableCheck: false }),
  })
  store.dispatch({ type: "chat/setMode", payload: "stream" })
  await store.dispatch(sendMessage("hi"))
  return store
    .getState()
    .chat.messages.filter((m) => m.role === "agent")
    .at(-1)
}

const labels = (agent) =>
  stepViews(agent).map((s) => (s.round > 1 ? `${s.node} · ${s.round}` : s.node))

describe("multi-node runs", () => {
  it("PLAN, REFLECT, PLAN, REFLECT give four steps and the last text is the answer", async () => {
    const agent = await run([
      chunk("PLAN", [text("plan 1")]),
      chunk("REFLECT", [text("reflect 1")]),
      chunk("INCREMENT_ITERATIONS", []),
      chunk("PLAN", [text("plan 2")]),
      chunk("REFLECT", [text("reflect 2")]),
    ])
    const views = stepViews(agent)
    expect(labels(agent)).toEqual([
      "PLAN",
      "REFLECT",
      "PLAN · 2",
      "REFLECT · 2",
    ])
    expect(views.map((v) => v.text)).toEqual([
      "plan 1",
      "reflect 1",
      "plan 2",
      "reflect 2",
    ])
    expect(agent.answer).toEqual(["reflect 2"])
    expect(agent.node).toBe("REFLECT")
  })

  it("the complete message's metadata.internal marks the step", async () => {
    const internal = (node, t) => ({
      ...chunk(node, [text(t)]),
      message: {
        role: "assistant",
        delta: false,
        content: [text(t)],
        metadata: { internal: true },
      },
    })
    const agent = await run([
      chunk("PLAN", [text("Which city?")]),
      // Deltas of the reflector show normally; the complete message flags it.
      chunk("REFLECT", [text("Greet")], { delta: true }),
      internal("REFLECT", "Greeting handled."),
    ])
    const views = stepViews(agent)
    expect(views.map((v) => !!v.internal)).toEqual([false, true])
    expect(views[answerIndex(views)].text).toBe("Which city?")
  })

  it("a step stays normal while only its deltas have arrived", async () => {
    const agent = await run([
      chunk("PLAN", [text("Which city?")]),
      chunk("REFLECT", [text("Greet")], { delta: true }),
    ])
    const views = stepViews(agent)
    expect(answerIndex(views)).toBe(1)
  })

  it("deltas across a node change go to separate steps", async () => {
    const agent = await run([
      chunk("PLAN", [text("Pl")], { delta: true }),
      chunk("PLAN", [text("an")], { delta: true }),
      chunk("REFLECT", [text("Ref")], { delta: true }),
      chunk("REFLECT", [text("lect")], { delta: true }),
    ])
    expect(stepViews(agent).map((v) => v.text)).toEqual(["Plan", "Reflect"])
    expect(agent.answer).toEqual(["Reflect"])
  })

  it("a tool call in PLAN and its result in ACT land in their own steps", async () => {
    const agent = await run([
      chunk("PLAN", [
        text("plan"),
        { type: "tool_call", id: "c1", name: "search", args: { q: "x" } },
      ]),
      chunk("ACT", [{ type: "tool_result", call_id: "c1", output: "found" }], {
        role: "tool",
      }),
      chunk("REFLECT", [text("done")]),
    ])
    const views = stepViews(agent)
    expect(views.map((v) => v.node)).toEqual(["PLAN", "ACT", "REFLECT"])
    expect(views[0].blocks.map((b) => b.kind)).toEqual(["tool_call"])
    expect(views[1].blocks.map((b) => b.kind)).toEqual(["tool_result"])
    expect(views[2].blocks).toEqual([])
  })

  it("a ReactAgent run (MAIN and TOOL) shows no step headers", async () => {
    const agent = await run([
      chunk("MAIN", [
        text("checking"),
        { type: "tool_call", id: "c1", name: "lookup", args: {} },
      ]),
      chunk("TOOL", [{ type: "tool_result", call_id: "c1", output: "ok" }], {
        role: "tool",
      }),
      chunk("MAIN", [text("final")]),
    ])
    expect(stepViews(agent)).toBeNull()
    expect(agent.answer).toEqual(["final"])
    expect(agent.blocks.map((b) => b.kind)).toEqual([
      "tool_call",
      "tool_result",
    ])
  })

  it("chunks without a node stay a flat turn", async () => {
    const agent = await run([chunk(undefined, [text("hi")])])
    expect(stepViews(agent)).toBeNull()
    expect(agent.answer).toEqual(["hi"])
  })
})

describe("repeated runs of one node", () => {
  const reasoning = (t) => ({ type: "reasoning", summary: t })

  it("a node's second run is its own step with its own reasoning row", async () => {
    const agent = await run([
      chunk("WEATHER", [text("It is sunny.")]),
      chunk("PLANNER", [reasoning("think 1")], { delta: true }),
      chunk("PLANNER", [reasoning("think 1"), text("Wear a hat.")]),
      chunk("PLANNER", [reasoning("think 2")], { delta: true }),
      chunk("PLANNER", [text("Also")], { delta: true }),
      chunk("PLANNER", [reasoning("think 2"), text("Also sunscreen.")]),
    ])
    expect(labels(agent)).toEqual(["WEATHER", "PLANNER", "PLANNER · 2"])
    const views = stepViews(agent)
    expect(views.map((v) => v.text)).toEqual([
      "It is sunny.",
      "Wear a hat.",
      "Also sunscreen.",
    ])
    const reasoningSteps = agent.blocks
      .filter((b) => b.kind === "reasoning")
      .map((b) => b.step)
    expect(reasoningSteps).toEqual([1, 2])
  })

  it("chunks of one run before its complete message stay in one step", async () => {
    const agent = await run([
      chunk("WEATHER", [text("Sun")], { delta: true }),
      chunk("WEATHER", [text("ny.")], { delta: true }),
      chunk("WEATHER", [text("Sunny.")]),
      chunk("PLANNER", [text("Hat.")]),
    ])
    expect(labels(agent)).toEqual(["WEATHER", "PLANNER"])
  })
})

describe("skipped handoff calls", () => {
  it("a tool result with metadata.not_run is marked notRun", async () => {
    const agent = await run([
      {
        thread_id: "t1",
        event: "message",
        metadata: { node: "TRIAGE_HANDOFF" },
        message: {
          role: "tool",
          delta: false,
          content: [
            {
              type: "tool_result",
              call_id: "c2",
              output: "Not run: control was transferred to WEATHER.",
            },
          ],
          metadata: { not_run: true },
        },
      },
    ])
    const result = agent.blocks.find((b) => b.kind === "tool_result")
    expect(result.notRun).toBe(true)
  })
})
