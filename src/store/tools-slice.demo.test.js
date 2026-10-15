import { configureStore } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { enterDemo, exitDemo } from "@/lib/demo/demo-mode"
import { rootReducer } from "@/store"
import { demoSwitched } from "@/store/app-actions"
import { upsertClientTool } from "@/store/tools-slice"

const KEY = "10xgraph.client-tools"
const mine = [{ id: "mine", name: "my_tool" }]

const makeStore = () => configureStore({ reducer: rootReducer })

describe("client tools in demo mode", () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(KEY, JSON.stringify(mine))
  })
  afterEach(() => exitDemo())

  it("hides the visitor's tools and never writes them", () => {
    const store = makeStore()
    enterDemo("support")
    store.dispatch(demoSwitched())
    expect(store.getState().tools.clientTools).toEqual([])

    store.dispatch(upsertClientTool({ id: "demo", name: "demo_tool" }))

    expect(JSON.parse(localStorage.getItem(KEY))).toEqual(mine)
  })

  it("brings the visitor's tools back on exit", () => {
    const store = makeStore()
    enterDemo("support")
    store.dispatch(demoSwitched())
    store.dispatch(upsertClientTool({ id: "demo", name: "demo_tool" }))
    exitDemo()
    store.dispatch(demoSwitched())

    expect(store.getState().tools.clientTools).toEqual(mine)
  })
})
