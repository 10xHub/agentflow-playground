import { configureStore } from "@reduxjs/toolkit"
import { act, render, waitFor } from "@testing-library/react"
import { Provider } from "react-redux"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  ConnectionProvider,
  useConnection,
} from "@/lib/connection/connection-context"
import { enterDemo, exitDemo, isDemoActive } from "@/lib/demo/demo-mode"
import fixture from "@/lib/demo/test-fixture"
import { rootReducer } from "@/store"
import { replaceThreads } from "@/store/chat-slice"

vi.mock("@/lib/demo/fixtures", () => ({
  loadFixture: vi.fn(async () => fixture),
  getLoadedFixture: vi.fn(() => fixture),
}))

let store
const renderProvider = () => {
  store = configureStore({
    reducer: rootReducer,
    middleware: (gdm) => gdm({ serializableCheck: false }),
  })
  return render(
    <Provider store={store}>
      <ConnectionProvider>
        <Probe />
      </ConnectionProvider>
    </Provider>
  )
}

let ctx
const Probe = () => {
  ctx = useConnection()
  return null
}

const snapshot = () =>
  Object.fromEntries(
    Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])
  )

const realFetch = globalThis.fetch

describe("demo connection", () => {
  beforeEach(() => {
    exitDemo()
    localStorage.clear()
    localStorage.setItem(
      "10xgraph.settings",
      JSON.stringify({ backendUrl: "http://mine:8000", name: "Mine" })
    )
    localStorage.setItem("10xgraph.connections", '[{"id":"mine"}]')
  })

  afterEach(() => {
    globalThis.fetch = realFetch
    exitDemo()
  })

  it("reconnects to the demo on reload, leaving the saved connection untouched", async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new TypeError("no network in demo")))
    const before = snapshot()
    enterDemo("support")
    renderProvider()
    await waitFor(() => expect(ctx.status).toBe("connected"))
    expect(ctx.active.id).toBe("demo")
    expect(ctx.isDemo).toBe(true)
    expect(snapshot()).toEqual(before)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it("restores the saved connection and threads when the visitor exits the demo", async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new TypeError("no network in demo")))
    enterDemo("support")
    renderProvider()
    await waitFor(() => expect(ctx.status).toBe("connected"))
    const mine = { order: ["real"], byId: { real: { messages: [] } }, activeId: null }
    localStorage.setItem("10xgraph.threads", JSON.stringify(mine))
    act(() => {
      store.dispatch(
        replaceThreads({ order: ["demo-x"], byId: { "demo-x": { messages: [] } } })
      )
    })
    act(() => ctx.disconnect())
    expect(ctx.isDemo).toBe(false)
    expect(ctx.active.backendUrl).toBe("http://mine:8000")
    expect(store.getState().chat.threads.order).toEqual(["real"])
  })

  it("re-verifying inside the demo re-probes the recording, not a server", async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new TypeError("no network in demo")))
    enterDemo("support")
    renderProvider()
    await waitFor(() => expect(ctx.status).toBe("connected"))

    const result = await act(() => ctx.connect(ctx.active))

    expect(result.ok).toBe(true)
    expect(ctx.isDemo).toBe(true)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it("connecting to a real server from the demo leaves the demo first", async () => {
    const body = { data: { info: { node_count: 3 }, nodes: [], edges: [] } }
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
    )
    enterDemo("support")
    renderProvider()
    await waitFor(() => expect(ctx.status).toBe("connected"))

    const result = await act(() =>
      ctx.connect({ id: "mine", name: "Mine", backendUrl: "http://mine:8000" })
    )

    expect(result.ok).toBe(true)
    expect(isDemoActive()).toBe(false)
    expect(ctx.isDemo).toBe(false)
    expect(ctx.active.backendUrl).toBe("http://mine:8000")
  })

  it("ignores a late result from the saved backend once the demo has started", async () => {
    // The app mounts with the saved real connection and starts its silent
    // re-probe; only then does /demo call connectDemo.
    let release
    const gate = new Promise((resolve) => (release = resolve))
    const body = { data: { info: { node_count: 9 }, nodes: [], edges: [] } }
    globalThis.fetch = vi.fn(() =>
      gate.then(
        () =>
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
      )
    )
    const before = snapshot()
    renderProvider()
    enterDemo("support")
    await act(() => ctx.connectDemo("support"))
    release()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(globalThis.fetch).toHaveBeenCalled()
    expect(ctx.active.id).toBe("demo")
    expect(snapshot()).toEqual(before)
  })
})
