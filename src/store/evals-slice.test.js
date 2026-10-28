import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

import sample from "@/demo/sample-eval-report.json"
import evalsReducer, {
  addParsedReport,
  openReportFiles,
  reportsCleared,
  selectEvalView,
} from "@/store/evals-slice"

const { notifyError } = vi.hoisted(() => ({ notifyError: vi.fn() }))
vi.mock("@/lib/notify", () => ({ notifyError }))

const make = () => configureStore({ reducer: { evals: evalsReducer } })

const file = (name, content) =>
  new File(
    [typeof content === "string" ? content : JSON.stringify(content)],
    name
  )

beforeEach(() => vi.clearAllMocks())

describe("evals slice", () => {
  it("opens report files, derives runs and selects the last one loaded", async () => {
    const store = make()
    await store.dispatch(openReportFiles([file("a.json", sample)]))
    const { evals } = store.getState()
    expect(evals.selectedRunId).toBe("a.json")
    expect(evals.loadError).toBeNull()
    const view = selectEvalView(store.getState())
    expect(view.runs.map((r) => r.id)).toEqual(["a.json"])
    expect(view.details["a.json"].cases).toHaveLength(5)
    expect(notifyError).not.toHaveBeenCalled()
  })

  it("keeps valid files and reports the invalid ones", async () => {
    const store = make()
    await store.dispatch(
      openReportFiles([
        file("good.json", sample),
        file("bad.json", { foo: 1 }),
        file("broken.json", "{"),
        file("notes.txt", "hi"),
      ])
    )
    const { evals } = store.getState()
    expect(evals.sources.map((s) => s.id)).toEqual(["good.json"])
    expect(evals.loadError).toMatch(/bad\.json is not an eval report/)
    expect(evals.loadError).toMatch(/broken\.json is not valid JSON/)
    expect(evals.loadError).toMatch(/notes\.txt is not a \.json file/)
    expect(notifyError).toHaveBeenCalledWith(
      "Could not open report",
      evals.loadError
    )
  })

  it("replaces a report opened again under the same name and clears the error", async () => {
    const store = make()
    await store.dispatch(openReportFiles([file("a.json", { foo: 1 })]))
    expect(store.getState().evals.loadError).toBeTruthy()
    await store.dispatch(openReportFiles([file("a.json", sample)]))
    await store.dispatch(openReportFiles([file("a.json", sample)]))
    expect(store.getState().evals.sources).toHaveLength(1)
    expect(store.getState().evals.loadError).toBeNull()
  })

  it("adds a parsed report and can be cleared", () => {
    const store = make()
    store.dispatch(addParsedReport({ id: "s", report: sample }))
    expect(store.getState().evals.selectedRunId).toBe("s")
    store.dispatch(reportsCleared())
    expect(store.getState().evals.sources).toEqual([])
  })
})
