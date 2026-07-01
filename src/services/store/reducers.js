import { combineReducers } from "redux"

import ct from "@constants/"

import chat from "./slices/chat.slice"
import events from "./slices/events.slice"
import memory from "./slices/memory.slice"
import multimodal from "./slices/multimodal.slice"
import runs from "./slices/runs.slice"
import settings from "./slices/settings.slice"
import state from "./slices/state.slice"
import theme from "./slices/theme.slice"
import threadSettings from "./slices/thread-settings.slice"

const rootReducer = combineReducers({
  [ct.store.THEME_STORE]: theme,
  [ct.store.CHAT_STORE]: chat,
  [ct.store.EVENTS_STORE]: events,
  [ct.store.SETTINGS_STORE]: settings,
  [ct.store.THREAD_SETTINGS_STORE]: threadSettings,
  [ct.store.STATE_STORE]: state,
  [ct.store.MEMORY_STORE]: memory,
  [ct.store.RUNS_STORE]: runs,
  [ct.store.MULTIMODAL_STORE]: multimodal,
})

export default rootReducer
