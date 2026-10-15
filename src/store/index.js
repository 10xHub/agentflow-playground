import { combineReducers, configureStore } from "@reduxjs/toolkit"

import { demoSwitched } from "./app-actions"
import chatReducer from "./chat-slice"
import evalsReducer from "./evals-slice"
import graphReducer from "./graph-slice"
import memoryReducer from "./memory-slice"
import observabilityReducer from "./observability-slice"
import stateReducer from "./state-slice"
import threadsReducer from "./threads-slice"
import toolsReducer from "./tools-slice"

const appReducer = combineReducers({
  chat: chatReducer,
  evals: evalsReducer,
  graph: graphReducer,
  memory: memoryReducer,
  observability: observabilityReducer,
  threadState: stateReducer,
  threads: threadsReducer,
  tools: toolsReducer,
})

// demoSwitched hands every slice `undefined`, so each re-runs its initial state.
export const rootReducer = (state, action) =>
  appReducer(action.type === demoSwitched.type ? undefined : state, action)

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    // Message objects from the SDK can carry non-serializable helpers; the
    // stored shapes are plain, but disable the check on stream chunks to be safe.
    getDefaultMiddleware({ serializableCheck: false }),
})

export default store
