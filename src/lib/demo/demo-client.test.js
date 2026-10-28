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
    expect(await c.observability("t1", "run1")).toEqual(
      fixture.observability.t1.runs.run1
    )
  })

  it("rejects an unknown thread like a 404", async () => {
    await expect(make().threadState("nope")).rejects.toMatchObject({
      status: 404,
    })
  })

  it("never shares mutations between instances or with the fixture", async () => {
    const c = make()
    await c.deleteThread("t1")
    expect(JSON.stringify(await c.threads())).not.toContain('"t1"')
    expect(JSON.stringify(await make().threads())).toContain('"t1"')
  })

  it("reports has_more for paged threads and messages", async () => {
    const c = make()
    const all = (await c.threads()).data.threads
    const first = await c.threads({ offset: 0, limit: 1 })
    expect(first.data.has_more).toBe(all.length > 1)
    const last = await c.threads({ offset: all.length - 1, limit: 1 })
    expect(last.data.has_more).toBe(false)
    const msgs = await c.threadMessages("t1", { offset: 0, limit: 1000 })
    expect(msgs.data.has_more).toBe(false)
  })

  it("applies memory search filters to the recording", async () => {
    const c = make()
    const all = (await c.searchMemory({ query: "broken order" })).data.results
    expect(all.length).toBeGreaterThan(0)
    const none = await c.searchMemory({
      query: "broken order",
      memory_type: "no-such-type",
    })
    expect(none.data.results).toEqual([])
    const high = await c.searchMemory({
      query: "broken order",
      score_threshold: 2,
    })
    expect(high.data.results).toEqual([])
  })

  it("lists no files", async () => {
    expect(await make().listFiles({ limit: 50, offset: 0 })).toEqual({
      data: { files: [], has_more: false, offset: 0, limit: 50 },
      metadata: { demo: true },
    })
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

  it("tolerates resume options and never emits an interrupt", async () => {
    const c = new DemoClient(fixture, { sleep: async () => {} })
    c.queueRun("a")
    const got = []
    for await (const chunk of c.stream([], {
      resume: true,
      interrupt_id: "i1",
    })) {
      got.push(chunk)
    }
    expect(got).toEqual(fixture.runs[0].chunks.map((x) => x.chunk))
    expect(got.some((x) => x.data?.status === "interrupted")).toBe(false)
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

describe("DemoClient paging and search", () => {
  it("filters threads by search and applies offset/limit", async () => {
    const c = make()
    const hit = await c.threads({ search: "ONE" })
    expect(hit.data.threads.map((t) => t.thread_id)).toEqual(["t1"])
    const second = await c.threads({ offset: 1, limit: 5 })
    expect(second.data.threads.map((t) => t.thread_id)).toEqual(["t2"])
    expect((await c.threads()).data.threads).toHaveLength(2)
  })

  it("pages recorded messages", async () => {
    const c = make()
    expect(
      (await c.threadMessages("t1", { offset: 0, limit: 100 })).data.messages
    ).toEqual(fixture.threadMessages.t1.data.messages)
    await expect(c.threadMessages("nope", { limit: 1 })).rejects.toMatchObject({
      status: 404,
    })
  })
})

describe("DemoClient files", () => {
  it("has no recorded files and says so", async () => {
    const c = make()
    await expect(c.getMultimodalConfig()).rejects.toMatchObject({ status: 404 })
    await expect(c.getFileInfo("f")).rejects.toMatchObject({ status: 404 })
    await expect(c.getFile("f")).rejects.toMatchObject({ status: 404 })
    await expect(c.getFileAccessUrl("f")).rejects.toMatchObject({ status: 404 })
  })
  it("refuses uploads and deletes with the demo note", async () => {
    const c = make()
    await expect(c.uploadFile({})).rejects.toThrow(
      /uploads are off in the demo/i
    )
    await expect(c.deleteFile("f")).rejects.toThrow(
      /uploads are off in the demo/i
    )
  })
})

describe("DemoClient memory writes", () => {
  it("stores a memory in the in-tab copy only", async () => {
    const c = make()
    const res = await c.storeMemory({
      content: "new fact",
      memory_type: "semantic",
      category: "notes",
      metadata: { a: 1 },
    })
    const { memories } = (await c.listMemories()).data
    const row = memories.find((m) => m.id === res.data.memory_id)
    expect(row).toMatchObject({
      content: "new fact",
      memory_type: "semantic",
      metadata: { a: 1, category: "notes" },
    })
    expect((await make().listMemories()).data.memories).toHaveLength(2)
  })
  it("updates content and metadata of an existing memory", async () => {
    const c = make()
    await c.updateMemory("m1", "edited", { metadata: { k: "v" } })
    const m1 = (await c.listMemories()).data.memories.find((m) => m.id === "m1")
    expect(m1.content).toBe("edited")
    expect(m1.metadata).toEqual({ k: "v" })
  })
  it("rejects an update for an unknown id", async () => {
    await expect(make().updateMemory("zz", "x")).rejects.toMatchObject({
      status: 404,
    })
  })
})
