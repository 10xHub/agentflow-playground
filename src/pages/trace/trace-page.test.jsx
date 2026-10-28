import { configureStore } from "@reduxjs/toolkit"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { act } from "react"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import fixture from "@/demo/fixtures/support.json"
import chatReducer, { setGenerating, setThreadId } from "@/store/chat-slice"
import obsReducer from "@/store/observability-slice"
import threadsReducer from "@/store/threads-slice"

import TracePage from "./trace-page"

const { client } = vi.hoisted(() => ({
  client: { observability: vi.fn(), threads: vi.fn() },
}))
vi.mock("@/lib/tenxgraph-client", () => ({ getTenxGraphClient: () => client }))
vi.mock("@/lib/connection/connection-context", () => ({
  useConnection: () => ({ isDemo: false }),
}))

const RUN = {
  run_id: "r1",
  status: "error",
  duration_ms: 1000,
  error: "tool exploded",
  model: "m1",
  models: ["m1"],
  notes: ["Invoke runs have approximate timings."],
  usage: { total_tokens: 150 },
  iterations: 2,
  spans: [
    {
      id: "root",
      name: "graph",
      kind: "root",
      parent: null,
      start_ms: 0,
      duration_ms: 1000,
      status: "error",
      inputs: { user_message: "hi" },
      outputs: { assistant_message: null },
    },
    {
      id: "s1",
      name: "node: agent",
      kind: "node",
      parent: "root",
      start_ms: 0,
      duration_ms: 400,
      status: "ok",
      visit: 1,
    },
    {
      id: "l1",
      name: "llm.generate",
      kind: "llm",
      parent: "s1",
      start_ms: 10,
      duration_ms: 300,
      status: "ok",
      total_tokens: 150,
      model: "m1",
    },
    {
      id: "s2",
      name: "node: agent",
      kind: "node",
      parent: "root",
      start_ms: 600,
      duration_ms: 300,
      status: "ok",
      visit: 2,
    },
    {
      id: "t1",
      name: "tool: lookup",
      kind: "tool",
      parent: "s2",
      start_ms: 610,
      duration_ms: 100,
      status: "error",
      error: "boom",
    },
  ],
  events: [],
}

const setup = ({ payload, url = "/trace" } = {}) => {
  client.observability.mockReset()
  client.threads.mockReset()
  client.threads.mockResolvedValue({
    data: {
      threads: [
        { thread_id: "t1", thread_name: "One" },
        { thread_id: "t2", thread_name: "Two" },
      ],
    },
  })
  client.observability.mockResolvedValue(
    payload ?? {
      thread_id: "t1",
      enabled: true,
      reason: null,
      run_count: 1,
      run_ids: ["r1"],
      run: RUN,
    }
  )
  const store = configureStore({
    reducer: {
      chat: chatReducer,
      observability: obsReducer,
      threads: threadsReducer,
    },
  })
  store.dispatch(setThreadId("t1"))
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[url]}>
        <TracePage />
      </MemoryRouter>
    </Provider>
  )
  return store
}

describe("TracePage", () => {
  it("reloads when a chat run finishes", async () => {
    const store = setup()
    await waitFor(() => expect(client.observability).toHaveBeenCalledTimes(1))
    act(() => store.dispatch(setGenerating(true)))
    act(() => store.dispatch(setGenerating(false)))
    await waitFor(() => expect(client.observability).toHaveBeenCalledTimes(2))
  })

  it("Refresh reloads the trace", async () => {
    setup()
    await waitFor(() => expect(client.observability).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByLabelText("Refresh trace"))
    await waitFor(() => expect(client.observability).toHaveBeenCalledTimes(2))
  })

  it("the ?thread= query drives the load", async () => {
    setup({ url: "/trace?thread=t2" })
    await waitFor(() =>
      expect(client.observability).toHaveBeenCalledWith("t2", undefined)
    )
  })

  it("the selector lists threads and loads the chosen one", async () => {
    setup()
    await screen.findByRole("option", { name: "Two" })
    fireEvent.change(screen.getByLabelText("Thread"), {
      target: { value: "t2" },
    })
    await waitFor(() =>
      expect(client.observability).toHaveBeenLastCalledWith("t2", undefined)
    )
  })

  it("renders title, subtitle, one row per node visit, run error and notes", async () => {
    setup()
    await screen.findByRole("tree")
    expect(screen.getByText("Run trace")).toBeTruthy()
    expect(screen.getByText(/kept in server memory/)).toBeTruthy()
    expect(
      screen
        .getAllByRole("treeitem")
        .filter((r) => r.textContent.includes("agent"))
    ).toHaveLength(2)
    expect(screen.getByText(/Run failed: tool exploded/)).toBeTruthy()
    expect(screen.getByText(/approximate timings/)).toBeTruthy()
  })

  it("selects the errored span by default and shows its error", async () => {
    setup()
    await screen.findByRole("tree")
    const alerts = screen.getAllByRole("alert").map((a) => a.textContent)
    expect(alerts.some((t) => t.includes("boom"))).toBe(true)
  })

  it("collapsing a node hides its children", async () => {
    setup()
    await screen.findByRole("tree")
    expect(screen.getAllByRole("treeitem")).toHaveLength(5)
    fireEvent.click(screen.getAllByLabelText("Collapse")[1])
    expect(screen.getAllByRole("treeitem")).toHaveLength(4)
    fireEvent.click(screen.getByText("Collapse all"))
    expect(screen.getAllByRole("treeitem")).toHaveLength(1)
    fireEvent.click(screen.getByText("Expand all"))
    expect(screen.getAllByRole("treeitem")).toHaveLength(5)
  })

  it.each([
    ["disabled_in_production", /MODE=production/],
    ["store_unavailable", /not available/],
    ["no_runs", /No runs captured/],
  ])("empty state for %s", async (reason, text) => {
    setup({
      payload: {
        thread_id: "t1",
        enabled: reason === "no_runs",
        reason,
        run_count: 0,
        run_ids: [],
        run: null,
      },
    })
    expect(await screen.findByText(text)).toBeTruthy()
    if (reason === "disabled_in_production") {
      expect(screen.queryByText(/Send a message/)).toBeNull()
    }
  })

  it("renders the recorded demo fixture (old shape) without new fields", async () => {
    const demo = fixture.observability["demo-history"].latest.data
    setup({ payload: demo, url: "/trace?thread=demo-history" })
    await screen.findByRole("tree")
    expect(screen.getAllByRole("treeitem").length).toBeGreaterThan(1)
    expect(screen.queryByText(/Run failed/)).toBeNull()
  })
})
