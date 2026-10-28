import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DemoClient } from "@/lib/demo/demo-client"
import { enterDemo, exitDemo } from "@/lib/demo/demo-mode"
import baseFixture from "@/lib/demo/test-fixture"
import chatReducer from "@/store/chat-slice"
import { rootReducer } from "@/store"
import { demoSwitched } from "@/store/app-actions"
import { abortActiveRun, sendDemoRun } from "@/store/chat-thunks"

const { current } = vi.hoisted(() => ({ current: { client: null } }))
vi.mock("@/lib/tenxgraph-client", () => ({
  getTenxGraphClient: () => current.client,
}))

const withThreads = () => {
  const f = structuredClone(baseFixture)
  f.runs[0].chunks.forEach(({ chunk }) => (chunk.thread_id = "t1"))
  f.runs[1].threadId = "t2"
  f.runs[1].chunks.forEach(({ chunk }) => (chunk.thread_id = "t2"))
  return f
}

const setup = (fixture) => {
  current.client = new DemoClient(fixture, { sleep: () => Promise.resolve() })
  return configureStore({
    reducer: { chat: chatReducer },
    middleware: (gdm) => gdm({ serializableCheck: false }),
  })
}

const userTexts = (store) =>
  store
    .getState()
    .chat.messages.filter((m) => m.role === "user")
    .map((m) => m.text)

describe("sendDemoRun", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("replays a recorded run through the normal send path", async () => {
    const fixture = withThreads()
    const store = setup(fixture)

    await store.dispatch(sendDemoRun(fixture.runs[0]))

    expect(userTexts(store)).toEqual(["first prompt"])
    expect(store.getState().chat.threadId).toBe("t1")
    expect(store.getState().chat.mode).toBe("stream")
    expect(current.client.availableRuns().map((r) => r.id)).toEqual(["b"])
  })

  it("builds the cURL for a local server, not the visitor's saved one", async () => {
    localStorage.setItem(
      "10xgraph.settings",
      JSON.stringify({
        backendUrl: "http://mine:8000",
        authMode: "bearer",
        authToken: "x",
      })
    )
    enterDemo("support")
    const fixture = withThreads()
    const store = setup(fixture)

    await store.dispatch(sendDemoRun(fixture.runs[0]))
    exitDemo()

    const request = store.getState().chat.lastRequest
    expect(request.url).toBe("http://localhost:8000/v1/graph/stream")
    expect(request.headers.Authorization).toBeUndefined()
  })

  it("opens a new chat thread when the run belongs to another recorded thread", async () => {
    const fixture = withThreads()
    const store = setup(fixture)

    await store.dispatch(sendDemoRun(fixture.runs[0]))
    await store.dispatch(sendDemoRun(fixture.runs[1]))

    expect(userTexts(store)).toEqual(["second prompt"])
    expect(store.getState().chat.threadId).toBe("t2")
  })

  it("keeps runs of the same recorded thread in one conversation", async () => {
    const fixture = withThreads()
    fixture.runs[1].threadId = "t1"
    fixture.runs[1].chunks.forEach(({ chunk }) => (chunk.thread_id = "t1"))
    const store = setup(fixture)

    await store.dispatch(sendDemoRun(fixture.runs[0]))
    await store.dispatch(sendDemoRun(fixture.runs[1]))

    expect(userTexts(store)).toEqual(["first prompt", "second prompt"])
  })

  it("writes nothing to the visitor's storage while a demo run plays", async () => {
    enterDemo("support")
    const fixture = withThreads()
    const store = setup(fixture)

    await store.dispatch(sendDemoRun(fixture.runs[0]))
    exitDemo()

    expect(localStorage.getItem("10xgraph.threads")).toBeNull()
  })

  it("drops the rest of a demo run when the visitor leaves mid-stream", async () => {
    const mine = {
      order: ["real"],
      byId: { real: { id: "real", messages: [] } },
      activeId: "real",
    }
    localStorage.setItem("10xgraph.threads", JSON.stringify(mine))
    enterDemo("support")
    const fixture = withThreads()
    let release
    const gate = new Promise((resolve) => (release = resolve))
    current.client = new DemoClient(fixture, { sleep: () => gate })
    const store = configureStore({
      reducer: rootReducer,
      middleware: (gdm) => gdm({ serializableCheck: false }),
    })

    const running = store.dispatch(sendDemoRun(fixture.runs[0]))
    await vi.waitFor(() => expect(store.getState().chat.threadId).toBe("t1"))

    // What leaveDemo does: abandon the run, clear the flag, reset every slice.
    abortActiveRun()
    exitDemo()
    store.dispatch(demoSwitched())
    release()
    await running

    expect(JSON.parse(localStorage.getItem("10xgraph.threads"))).toEqual(mine)
    expect(store.getState().chat.threadId).toBe("real")
    expect(store.getState().chat.threads.order).toEqual(["real"])
    expect(store.getState().chat.generating).toBe(false)
  })
})
