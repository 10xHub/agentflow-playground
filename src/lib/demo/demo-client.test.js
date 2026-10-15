import { describe, expect, it } from "vitest"

import { DemoClient } from "@/lib/demo/demo-client"
import fixture from "@/lib/demo/test-fixture"

const instant = () => Promise.resolve()
const make = () => new DemoClient(fixture, { sleep: instant })

describe("DemoClient reads", () => {
  it("returns recorded responses verbatim", async () => {
    const c = make()
    expect(await c.graph()).toEqual(fixture.graph)
    expect(await c.threadState("t1")).toEqual(fixture.threadState.t1)
    expect(await c.observability("t1")).toEqual(fixture.observability.t1.latest)
    expect(await c.observability("t1", "run1")).toEqual(fixture.observability.t1.runs.run1)
  })

  it("rejects an unknown thread like a 404", async () => {
    await expect(make().threadState("nope")).rejects.toMatchObject({ status: 404 })
  })

  it("never shares mutations between instances or with the fixture", async () => {
    const c = make()
    await c.deleteThread("t1")
    expect(JSON.stringify(await c.threads())).not.toContain('"t1"')
    expect(JSON.stringify(await make().threads())).toContain('"t1"')
  })

  it("deletes a memory locally", async () => {
    const c = make()
    const [first] = (await c.listMemories()).data.memories
    await c.deleteMemory(first.id)
    const ids = (await c.listMemories()).data.memories.map((m) => m.id)
    expect(ids).not.toContain(first.id)
  })
})

describe("DemoClient runs", () => {
  it("offers only runs whose dependency has played", () => {
    const c = make()
    expect(c.availableRuns().map((r) => r.id)).toEqual(["a"])
    c.markPlayed("a")
    expect(c.availableRuns().map((r) => r.id)).toEqual(["b"])
  })
})

describe("DemoClient.stream", () => {
  it("replays the queued run's chunks in order, with capped gaps", async () => {
    const waits = []
    const c = new DemoClient(fixture, { sleep: async (ms) => waits.push(ms) })
    c.queueRun("a")
    const got = []
    for await (const chunk of c.stream([])) got.push(chunk)
    expect(got).toEqual(fixture.runs[0].chunks.map((x) => x.chunk))
    expect(waits).toEqual([40])
  })

  it("caps long recorded pauses", async () => {
    const slow = structuredClone(fixture)
    slow.runs[0].chunks[1].t = 60000
    const waits = []
    const c = new DemoClient(slow, { sleep: async (ms) => waits.push(ms) })
    c.queueRun("a")
    for await (const _ of c.stream([])) void _
    expect(waits).toEqual([DemoClient.MAX_GAP_MS])
  })

  it("stops yielding when the consumer breaks (Stop) and unlocks the next run", async () => {
    const c = new DemoClient(fixture, { sleep: () => Promise.resolve() })
    c.queueRun("a")
    const got = []
    for await (const chunk of c.stream([])) {
      got.push(chunk)
      break
    }
    expect(got).toHaveLength(1)
    expect(c.availableRuns().map((r) => r.id)).toEqual(["b"])
  })

  it("refuses to stream without a queued run", async () => {
    const c = new DemoClient(fixture, { sleep: () => Promise.resolve() })
    await expect(async () => {
      for await (const _ of c.stream([])) void _
    }).rejects.toThrow("Pick one of the suggested prompts")
  })

  it("replays each queued run once per queue", async () => {
    const c = new DemoClient(fixture, { sleep: () => Promise.resolve() })
    c.queueRun("a")
    for await (const _ of c.stream([])) void _
    await expect(async () => {
      for await (const _ of c.stream([])) void _
    }).rejects.toThrow("Pick one of the suggested prompts")
  })
})

describe("DemoClient.recordedQueries", () => {
  it("lists the memory searches the recording holds", () => {
    expect(make().recordedQueries()).toEqual(["contact preference"])
  })
})
