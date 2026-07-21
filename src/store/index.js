import { configureStore } from "@reduxjs/toolkit"

import chatReducer from "./chatSlice"
import evalsReducer from "./evalsSlice"
import graphReducer from "./graphSlice"
import memoryReducer from "./memorySlice"
import observabilityReducer from "./observabilitySlice"
import stateReducer from "./stateSlice"
import threadsReducer from "./threadsSlice"
import toolsReducer from "./toolsSlice"

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
