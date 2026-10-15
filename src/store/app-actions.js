import { createAction } from "@reduxjs/toolkit"

// Entering or leaving the recorded demo swaps the app's data source, so every
// slice starts over (store/index.js). Nothing from the demo survives into the
// visitor's own session, and nothing of theirs shows inside the demo.
export const demoSwitched = createAction("app/demoSwitched")
