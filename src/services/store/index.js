/* eslint-disable import/order */
import { configureStore } from "@reduxjs/toolkit"
import {
  createTransform,
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist"
import storage from "redux-persist/lib/storage"

// app constants
import ct from "@constants/"
import rootReducer from "./reducers"
// import * as Sentry from '@sentry/react'

// Transform to drop non-serializable fields from chat store when persisting
const stripNonSerializableFromChat = createTransform(
  (inboundState, key) => {
    if (key === ct.store.CHAT_STORE) {
      const { abortControllers, ...rest } = inboundState || {}
      return { ...rest, abortControllers: {} }
    }
    return inboundState
  },
  (outboundState) => outboundState
)

export const config = {
  key: "root",
  storage,

  debug: import.meta.env.DEV,
  transforms: [stripNonSerializableFromChat],
}

const resetEnhancer = (root) => (state, action) => {
  if (action.type !== "RESET") return root(state, action)
  storage.removeItem("persist:root")
  return root(undefined, {})
}

const persistedReducer = persistReducer(config, resetEnhancer(rootReducer))

// const sentryReduxEnhancer = Sentry.createReduxEnhancer({
//     // Optionally pass options listed below
// })

export const store = configureStore({
  reducer: persistedReducer,

  devTools: import.meta.env.DEV,
  // enhancers: [sentryReduxEnhancer], # Add Sentry
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredPaths: [
          `${ct.store.CHAT_STORE}.abortControllers`,
          `${ct.store.CHAT_STORE}.error`,
        ],
      },
    }),
})

export const mockStore = configureStore({
  reducer: rootReducer,
})

export const persistor = persistStore(store)
