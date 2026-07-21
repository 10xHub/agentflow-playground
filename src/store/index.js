import { configureStore } from "@reduxjs/toolkit"

import chatReducer from "./chat-slice"
import evalsReducer from "./evals-slice"
import graphReducer from "./graph-slice"
import memoryReducer from "./memory-slice"
import observabilityReducer from "./observability-slice"
import stateReducer from "./state-slice"
import threadsReducer from "./threads-slice"
import toolsReducer from "./tools-slice"

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    evals: evalsReducer,
    graph: graphReducer,
    memory: memoryReducer,
    observability: observabilityReducer,
    threadState: stateReducer,
    threads: threadsReducer,
    tools: toolsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    // Message objects from the SDK can carry non-serializable helpers; the
    // stored shapes are plain, but disable the check on stream chunks to be safe.
    getDefaultMiddleware({ serializableCheck: false }),
})

export default store
