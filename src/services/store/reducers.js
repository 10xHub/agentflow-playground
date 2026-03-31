import { combineReducers } from "redux"

import ct from "@constants/"

import chat from "./slices/chat.slice"
import settings from "./slices/settings.slice"
import state from "./slices/state.slice"
import theme from "./slices/theme.slice"
import threadSettings from "./slices/thread-settings.slice"

const rootReducer = combineReducers({
  [ct.store.THEME_STORE]: theme,
  [ct.store.CHAT_STORE]: chat,
  [ct.store.SETTINGS_STORE]: settings,
  [ct.store.THREAD_SETTINGS_STORE]: threadSettings,
  [ct.store.STATE_STORE]: state,
})

export default rootReducer
