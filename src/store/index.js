import { configureStore } from "@reduxjs/toolkit"

import chatReducer from "./chatSlice"
import graphReducer from "./graphSlice"
import threadsReducer from "./threadsSlice"

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    graph: graphReducer,
    threads: threadsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    // Message objects from the SDK can carry non-serializable helpers; the
    // stored shapes are plain, but disable the check on stream chunks to be safe.
    getDefaultMiddleware({ serializableCheck: false }),
})

export default store
